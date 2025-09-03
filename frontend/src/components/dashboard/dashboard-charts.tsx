import React from 'react';
import ReactECharts from 'echarts-for-react';

const StackedPercentageBarChart: React.FC = () => {
  const simulatedData = [
    { date: '2025-05-17', Offline: 3, Error: 2, Maintenance: 1, Idle: 6, Running: 12 },
    { date: '2025-05-18', Offline: 4, Error: 1, Maintenance: 2, Idle: 7, Running: 10 },
    { date: '2025-05-19', Offline: 2, Error: 1, Maintenance: 3, Idle: 5, Running: 13 },
    { date: '2025-05-20', Offline: 1, Error: 3, Maintenance: 2, Idle: 8, Running: 10 },
    { date: '2025-05-21', Offline: 5, Error: 2, Maintenance: 1, Idle: 4, Running: 12 },
    { date: '2025-05-22', Offline: 3, Error: 1, Maintenance: 2, Idle: 9, Running: 9 },
    { date: '2025-05-23', Offline: 2, Error: 2, Maintenance: 1, Idle: 7, Running: 12 },
    { date: '2025-05-24', Offline: 4, Error: 1, Maintenance: 3, Idle: 6, Running: 10 },
    { date: '2025-05-25', Offline: 1, Error: 2, Maintenance: 2, Idle: 5, Running: 14 },
    { date: '2025-05-26', Offline: 3, Error: 1, Maintenance: 2, Idle: 6, Running: 12 }
  ];

  const states = ["Offline", "Error", "Maintenance", "Idle", "Running"]

  const series = states.slice().reverse().map((state, index, arr) => ({
    name: state,
    type: 'bar',
    stack: 'total',
    emphasis: { disabled: true },
    barCategoryGap: '8px',
    itemStyle: {
      borderRadius: index === 0 ? [0, 0, 4, 4] : index === arr.length - 1 ? [4, 4, 0, 0] : 0
    },
    data: simulatedData.map((d) => d[state]),
  }));

  const option = {
    color: ['#3CA0C9', '#454F63', '#FCA82B', '#A73737','#E4E7EC'],
    legend: { top: 0, show: false },
    grid: { left: 10, right: 10, top: 0, bottom: 40 },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const dateStr = params[0].dataIndex !== undefined
          ? simulatedData[params[0].dataIndex].date
          : '';
        const date = new Date(dateStr);

        const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        const dayName = dayNames[date.getDay()];
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        const total = params.reduce((sum: number, p: any) => sum + p.value, 0);
        const header = `${dayName}. ${day}.${month}.${year} <span>(${total}h)<span>`;

        const details = params
          .slice().reverse().map((p: any) => {
            const hours = p.value;
            const percent = ((hours / total) * 100).toFixed(1);
            return `<div class="muct_row"><div>${p.marker} ${p.seriesName === "Maintenance" ? "Maint." : p.seriesName}</div><div><span>${percent}%</span></div><div>${hours}<span>h</span></div></div>`;
          })
          .join('');
        return `<div class="machine_uptime_chart_tooltip"><div class="muct_header">${header}</div><div class="muct_details">${details}<div></div>`;
      }
    },
    xAxis: {
      type: 'category',
      axisLine: { show: false },
      data: simulatedData.map((d) => {
        const date = new Date(d.date);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${day}.${month}`;
      }),
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      max: 24,
      show: false
    },
    series
  };

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '200px' }}>
      <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default StackedPercentageBarChart;
