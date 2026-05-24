import { toPng } from 'html-to-image';

/**
 * Captures a DOM node and downloads it as a PNG image.
 * 
 * @param {string} elementId - The ID of the HTML element to capture.
 * @param {string} fileName - The name of the downloaded file.
 */
export const downloadChartAsPng = (elementId, fileName) => {
  const node = document.getElementById(elementId);
  if (!node) {
    console.error(`Element with id ${elementId} not found.`);
    return;
  }

  // Adding a slight delay or ensuring styles are computed can help recharts render correctly.
  toPng(node, { 
    cacheBust: true, 
    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-primary') || '#0f172a',
    style: {
      padding: '20px' // Add padding so the chart isn't glued to the edges
    }
  })
    .then((dataUrl) => {
      const link = document.createElement('a');
      link.download = `${fileName}.png`;
      link.href = dataUrl;
      link.click();
    })
    .catch((err) => {
      console.error('Error generating image:', err);
      alert('Erro ao exportar o gráfico. Tente novamente.');
    });
};
