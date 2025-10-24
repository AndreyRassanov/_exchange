import React, { useRef, useEffect, useState, useCallback } from 'react';

interface GraphProps {
  xData: number[];
  yData: number[];
  width?: number;
  height?: number;
  margin?: number;
  lineColor?: string;
  pointColor?: string;
  gridColor?: string;
}

const Graph: React.FC<GraphProps> = ({
  xData,
  yData,
  width = 600,
  height = 400,
  margin = 50,
  lineColor = '#007acc',
  pointColor = '#ff4444',
  gridColor = '#e0e0e0'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Выносим вычисления в useCallback чтобы избежать лишних перерисовок
  const calculateScales = useCallback(() => {
    const minX = Math.min(...xData);
    const maxX = Math.max(...xData);
    const minY = Math.min(...yData);
    const maxY = Math.max(...yData);

    const scaleX = (width - 2 * margin) / (maxX - minX || 1);
    const scaleY = (height - 2 * margin) / (maxY - minY || 1);

    return { minX, maxX, minY, maxY, scaleX, scaleY };
  }, [xData, yData, width, height, margin]);

  // Функция для преобразования координат
  const getCoordinateConverters = useCallback((scales: ReturnType<typeof calculateScales>) => {
    const { minX, minY, scaleX, scaleY } = scales;
    return {
      toCanvasX: (x: number) => margin + (x - minX) * scaleX,
      toCanvasY: (y: number) => height - margin - (y - minY) * scaleY,
      toDataX: (canvasX: number) => minX + (canvasX - margin) / scaleX,
      toDataY: (canvasY: number) => minY + (height - margin - canvasY) / scaleY
    };
  }, [margin, height]);

  // Основная функция отрисовки
  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Очистка canvas
    ctx.clearRect(0, 0, width, height);

    const scales = calculateScales();
    const { toCanvasX, toCanvasY } = getCoordinateConverters(scales);

    // Рисуем сетку
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.font = '12px Arial';
    ctx.fillStyle = '#666';
    
    // Вертикальные линии сетки
    const xSteps = Math.min(10, scales.maxX - scales.minX);
    for (let i = 0; i <= xSteps; i++) {
      const x = scales.minX + (scales.maxX - scales.minX) * (i / xSteps);
      const canvasX = toCanvasX(x);
      
      ctx.beginPath();
      ctx.moveTo(canvasX, margin);
      ctx.lineTo(canvasX, height - margin);
      ctx.stroke();
      
      // Подписи по оси X
      ctx.textAlign = 'center';
      ctx.fillText(x.toFixed(2), canvasX, height - margin + 20);
    }

    // Горизонтальные линии сетки
    const ySteps = Math.min(10, scales.maxY - scales.minY);
    for (let i = 0; i <= ySteps; i++) {
      const y = scales.minY + (scales.maxY - scales.minY) * (i / ySteps);
      const canvasY = toCanvasY(y);
      
      ctx.beginPath();
      ctx.moveTo(margin, canvasY);
      ctx.lineTo(width - margin, canvasY);
      ctx.stroke();
      
      // Подписи по оси Y
      ctx.textAlign = 'right';
      ctx.fillText(y.toFixed(2), margin - 10, canvasY + 4);
    }

    // Оси
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    
    // Ось X
    ctx.beginPath();
    ctx.moveTo(margin, height - margin);
    ctx.lineTo(width - margin, height - margin);
    ctx.stroke();

    // Ось Y
    ctx.beginPath();
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, height - margin);
    ctx.stroke();

    // Рисуем линию графика
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < xData.length; i++) {
      const canvasX = toCanvasX(xData[i]);
      const canvasY = toCanvasY(yData[i]);
      
      if (i === 0) {
        ctx.moveTo(canvasX, canvasY);
      } else {
        ctx.lineTo(canvasX, canvasY);
      }
    }
    ctx.stroke();

    // Рисуем точки
    ctx.fillStyle = pointColor;
    for (let i = 0; i < xData.length; i++) {
      const canvasX = toCanvasX(xData[i]);
      const canvasY = toCanvasY(yData[i]);
      
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 4, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Подсвечиваем точку при наведении
    if (hoveredPoint !== null && hoveredPoint >= 0 && hoveredPoint < xData.length) {
      const canvasX = toCanvasX(xData[hoveredPoint]);
      const canvasY = toCanvasY(yData[hoveredPoint]);
      
      // Большая точка
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 6, 0, 2 * Math.PI);
      ctx.fill();
      
      // Текст с координатами
      ctx.fillStyle = '#000';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(
        `(${xData[hoveredPoint].toFixed(2)}, ${yData[hoveredPoint].toFixed(2)})`,
        canvasX + 10,
        canvasY - 10
      );
    }
  }, [xData, yData, width, height, margin, lineColor, pointColor, gridColor, hoveredPoint, calculateScales, getCoordinateConverters]);

  // Обработчик для определения точки под курсором
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const scales = calculateScales();
    const { toDataX, toDataY } = getCoordinateConverters(scales);

    // Находим ближайшую точку
    let closestIndex = -1;
    let minDistance = Infinity;

    for (let i = 0; i < xData.length; i++) {
      const canvasX = margin + (xData[i] - scales.minX) * scales.scaleX;
      const canvasY = height - margin - (yData[i] - scales.minY) * scales.scaleY;
      
      const distance = Math.sqrt(
        Math.pow(mouseX - canvasX, 2) + Math.pow(mouseY - canvasY, 2)
      );

      if (distance < 20 && distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    setHoveredPoint(closestIndex !== -1 ? closestIndex : null);
  }, [xData, yData, margin, height, calculateScales, getCoordinateConverters]);

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
  }, []);

  useEffect(() => {
    drawGraph();
  }, [drawGraph]);

  // Проверка данных - ДОЛЖНА БЫТЬ ПОСЛЕ ВСЕХ ХУКОВ
  if (xData.length !== yData.length || xData.length === 0) {
    return <div>Ошибка: массивы данных должны быть одинаковой длины и не пустыми</div>;
  }

  return (
    <div style={{ border: '1px solid #ccc', padding: '10px', display: 'inline-block' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: 'pointer' }}
      />
    </div>
  );
};

// Упрощенный пример использования
const App: React.FC = () => {
  const [xData] = useState([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const [yData] = useState([0, 1, 4, 9, 16, 25, 36, 49, 64, 81]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>График функции y = x²</h2>
      <Graph
        xData={xData}
        yData={yData}
        width={800}
        height={500}
      />
    </div>
  );
};

export default App;
