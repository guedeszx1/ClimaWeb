import os
import glob
import pandas as pd
from datetime import datetime
from supabase import create_client, Client

def obter_estacao_sul(dt):
    md = (dt.month, dt.day)
    if (3, 20) <= md < (6, 21): return 'Outono'
    elif (6, 21) <= md < (9, 22): return 'Inverno'
    elif (9, 22) <= md < (12, 21): return 'Primavera'
    else: return 'Verão'

def main():
    print("Iniciando migração de dados locais para o Supabase...")
    
    # 1. Carregar credenciais do Supabase de secrets.toml
    url = None
    key = None
    secrets_path = os.path.join(".streamlit", "secrets.toml")
    if os.path.exists(secrets_path):
        with open(secrets_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("SUPABASE_URL"):
                    url = line.split("=")[1].strip().strip('"').strip("'")
                elif line.startswith("SUPABASE_KEY"):
                    key = line.split("=")[1].strip().strip('"').strip("'")
                    
    if not url or not key:
        print("Erro: SUPABASE_URL ou SUPABASE_KEY não encontrados em secrets.toml.")
        return

    print(f"Credenciais carregadas. URL: {url}")
    
    # 2. Carregar dados das planilhas locais
    script_dir = os.path.dirname(os.path.abspath(__file__))
    files = glob.glob(os.path.join(script_dir, "*202*.csv"))
    if not files:
        files = glob.glob(os.path.join(script_dir, "*.csv"))
    if not files:
        files = glob.glob("*.csv")
        
    all_df = []
    print(f"Arquivos CSV encontrados para processar: {[os.path.basename(f) for f in files]}")
    
    for f in files:
        if "Matriz" in f or "analise_pibic_final" in f or "auditoria" in f:
            continue
            
        try:
            df_temp = None
            for enc in ['latin1', 'utf-8', 'cp1252']:
                for separator in [';', ',']:
                    try:
                        df_test = pd.read_csv(f, on_bad_lines='skip', sep=separator, encoding=enc, nrows=5)
                        if len(df_test.columns) > 1:
                            df_temp = pd.read_csv(f, on_bad_lines='skip', sep=separator, encoding=enc)
                            break
                    except Exception:
                        continue
                if df_temp is not None:
                    break
            
            if df_temp is None:
                df_temp = pd.read_csv(f, on_bad_lines='skip')
                
            df_temp.columns = df_temp.columns.str.strip().str.replace('\n', '').str.replace('\r', '')
            col_data = [c for c in df_temp.columns if 'DATA' in c.upper() or 'CARTA' in c.upper()]
            col_regiao = [c for c in df_temp.columns if 'REGI' in c.upper()]
            col_massa = [c for c in df_temp.columns if 'MASSA' in c.upper()]
            col_desc = [c for c in df_temp.columns if 'DESC' in c.upper()]
            
            if not col_data: continue
                
            df_novo = pd.DataFrame()
            df_novo['DATA CARTA'] = df_temp[col_data[0]]
            df_novo['REGIÃO'] = df_temp[col_regiao[0]] if col_regiao else "Não Informada"
            df_novo['MASSA DE AR'] = df_temp[col_massa[0]] if col_massa else "Não Informada"
            df_novo['DESCRIÇÃO'] = df_temp[col_desc[0]] if col_desc else ""
            
            df_novo = df_novo.dropna(subset=['DATA CARTA'])
            all_df.append(df_novo)
            print(f"Lido com sucesso: {os.path.basename(f)} ({len(df_novo)} linhas)")
            
        except Exception as e:
            print(f"Erro ao ler {os.path.basename(f)}: {e}")
            continue
            
    if not all_df:
        print("Erro: Nenhum dado lido dos CSVs.")
        return
        
    df_all = pd.concat(all_df, ignore_index=True)
    
    # Tratamento de Datas
    df_all['DATA CARTA_LIMPA'] = pd.to_datetime(df_all['DATA CARTA'], errors='coerce')
    df_all = df_all.dropna(subset=['DATA CARTA_LIMPA'])
    df_all['DATA EXIBIÇÃO'] = df_all['DATA CARTA_LIMPA'].dt.date
    
    # Normalização
    df_all['MASSA DE AR'] = df_all['MASSA DE AR'].astype(str).str.strip().replace('mT c', 'mTc')
    df_all['REGIÃO'] = df_all['REGIÃO'].astype(str).str.strip()
    df_all['DESCRIÇÃO'] = df_all['DESCRIÇÃO'].astype(str).str.strip()
    df_all['ESTAÇÃO'] = df_all['DATA CARTA_LIMPA'].apply(obter_estacao_sul)
    
    # Preparar colunas do Supabase
    df_all['MASSA DE AR IA'] = df_all['MASSA DE AR']
    df_all['MASSA DE AR FINAL'] = df_all['MASSA DE AR']
    df_all['STATUS DA INFORMAÇÃO'] = '100% IA (Não Validado)'
    df_all['DATA VERIFICACAO'] = None
    
    # Carregar auditoria se houver
    arquivo_auditoria = os.path.join(script_dir, "auditoria_cartas.csv")
    if os.path.exists(arquivo_auditoria):
        try:
            df_audit = pd.read_csv(arquivo_auditoria, encoding='utf-8')
            if not df_audit.empty:
                print(f"Auditorias encontradas: {len(df_audit)} registros")
                df_all['DataStr'] = df_all['DATA EXIBIÇÃO'].astype(str)
                df_audit['DataStr'] = df_audit['Data'].astype(str)
                df_audit['Região_Clean'] = df_audit['Região'].astype(str).str.strip()
                
                # Pegar apenas a última auditoria por data e região
                if 'Data_Verificacao' in df_audit.columns:
                    df_audit = df_audit.sort_values('Data_Verificacao').drop_duplicates(subset=['DataStr', 'Região_Clean'], keep='last')
                
                # Mesclar
                df_all = df_all.merge(
                    df_audit[['DataStr', 'Região_Clean', 'IA_Acertou', 'Massa_Real', 'Data_Verificacao']],
                    left_on=['DataStr', 'REGIÃO'],
                    right_on=['DataStr', 'Região_Clean'],
                    how='left'
                )
                
                mask_auditado = df_all['IA_Acertou'].notna()
                mask_acertou = df_all['IA_Acertou'] == 'Sim'
                mask_errou = df_all['IA_Acertou'] == 'Não'
                
                df_all.loc[mask_auditado & mask_acertou, 'STATUS DA INFORMAÇÃO'] = 'Validado Humano (IA Acertou)'
                df_all.loc[mask_auditado & mask_errou, 'STATUS DA INFORMAÇÃO'] = 'Corrigido Humano (IA Errou)'
                df_all.loc[mask_auditado, 'MASSA DE AR FINAL'] = df_all.loc[mask_auditado, 'Massa_Real']
                df_all.loc[mask_auditado, 'DATA VERIFICACAO'] = df_all.loc[mask_auditado, 'Data_Verificacao']
                
                # Limpar colunas temporárias
                df_all = df_all.drop(columns=['DataStr', 'Região_Clean', 'IA_Acertou', 'Massa_Real', 'Data_Verificacao'], errors='ignore')
                print("Auditorias integradas com sucesso.")
        except Exception as e:
            print(f"Aviso: Erro ao integrar auditorias: {e}")
            
    # Remover duplicatas de (DATA EXIBIÇÃO, REGIÃO) antes de enviar para o Supabase
    original_len = len(df_all)
    df_all = df_all.drop_duplicates(subset=['DATA EXIBIÇÃO', 'REGIÃO'], keep='last')
    deduplicated_len = len(df_all)
    if original_len != deduplicated_len:
        print(f"Deduplicação: removidos {original_len - deduplicated_len} registros duplicados para (DATA EXIBIÇÃO, REGIÃO).")
            
    # Mapear para o formato do banco de dados clima_registros
    records_to_insert = []
    for _, row in df_all.iterrows():
        # Tratar nulos para campos opcionais
        desc = row['DESCRIÇÃO']
        if pd.isna(desc) or str(desc).lower() == 'nan':
            desc = None
            
        data_verif = row['DATA VERIFICACAO']
        if pd.isna(data_verif) or data_verif is None:
            data_verif = None
        else:
            # Garantir formato válido de data/hora (YYYY-MM-DD HH:MM:SS)
            try:
                # Se for string, tentamos validar
                data_verif = str(data_verif).strip()
            except Exception:
                data_verif = None

        record = {
            "data_exibicao": str(row['DATA EXIBIÇÃO']),
            "regiao": str(row['REGIÃO']),
            "massa_de_ar_ia": str(row['MASSA DE AR IA']),
            "massa_de_ar_final": str(row['MASSA DE AR FINAL']),
            "descricao": desc,
            "estacao": str(row['ESTAÇÃO']),
            "status_informacao": str(row['STATUS DA INFORMAÇÃO']),
            "data_verificacao": data_verif
        }
        records_to_insert.append(record)
        
    print(f"Total de registros preparados para envio: {len(records_to_insert)}")
    
    # 3. Enviar para o Supabase
    supabase: Client = create_client(url, key)
    
    batch_size = 500
    total_records = len(records_to_insert)
    inserted_count = 0
    
    for i in range(0, total_records, batch_size):
        batch = records_to_insert[i:i+batch_size]
        try:
            supabase.table("clima_registros").upsert(batch).execute()
            inserted_count += len(batch)
            print(f"Progresso: {inserted_count}/{total_records} registros enviados...")
        except Exception as e:
            print(f"Erro ao enviar lote {i} a {i+batch_size}: {e}")
            print("Tentando enviar registro por registro neste lote para identificar ou salvar o que for possível...")
            for r in batch:
                try:
                    supabase.table("clima_registros").upsert(r).execute()
                    inserted_count += 1
                except Exception as ex:
                    print(f"Erro no registro {r['data_exibicao']} - {r['regiao']}: {ex}")
                    
    print(f"Concluído! {inserted_count} de {total_records} registros foram processados e salvos no Supabase.")

if __name__ == "__main__":
    main()
