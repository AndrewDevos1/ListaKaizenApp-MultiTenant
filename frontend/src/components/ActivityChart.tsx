import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ActivityChartProps {
  data: {
    labels: string[];
    data: number[];
  };
}

const ActivityChart: React.FC<ActivityChartProps> = ({ data: chartData }) => {
  const data = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Listas Preenchidas',
        data: chartData.data,
        fill: false,
        backgroundColor: 'rgb(78, 115, 223)',
        borderColor: 'rgba(78, 115, 223, 0.5)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Atividade do Sistema (Últimos 7 Dias)',
      },
    },
  };

  return <Line options={options} data={data} />;
};

export default ActivityChart;