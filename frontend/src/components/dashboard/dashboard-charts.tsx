import React from 'react';
import ReactECharts from 'echarts-for-react';

const StackedPercentageBarChart: React.FC = () => {
  const rawData = [
    [100, 302, 301, 334, 390, 330, 320],
    [320, 132, 101, 134, 90, 230, 210],
    [220, 182, 191, 234, 290, 330, 310],
    [150, 212, 201, 154, 190, 330, 410],
    [820, 832, 901, 934, 1290, 1330, 1320]
  ];

  const totalData: number[] = [];
  for (let i = 0; i < rawData[0].length; ++i) {
    let sum = 0;
    for (let j = 0; j < rawData.length; ++j) {
      sum += rawData[j][i];
    }
    totalData.push(sum);
  }

  const grid = {
    left: 0,
    right: 0,
    top: 50,
    bottom: 20
  };

  const series = [
    'Direct',
    'Mail Ad',
    'Affiliate Ad',
    'Video Ad',
    'Search Engine'
  ].map((name, sid) => ({
    name,
    type: 'bar',
    stack: 'total',
    barWidth: '60%',
    label: {
      show: false // 🔕 Hides the percentage labels
    },
    data: rawData[sid].map((d, did) =>
      totalData[did] <= 0 ? 0 : d / totalData[did]
    )
  }));

  const option = {
    color: ['#3CA0C9', '#454F63', '#FCA82B', '#A73737','#E4E7EC'],
    legend: {
      selectedMode: false
    },
    grid,
    yAxis: {
      type: 'value'
    },
    xAxis: {
      type: 'category',
      data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    },
    series
  };

  return (
    <div style={{ width: '100%', height: '100%', minHeight:"200px" }}>
      <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default StackedPercentageBarChart;
 