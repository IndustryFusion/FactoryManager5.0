import React, { useEffect, useState, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { getMachineState10Days, getMachineStateIntraDays } from '@/utility/chartUtility';
import { showToast } from "@/utility/toast";
import { Toast } from "primereact/toast";
import axios from "axios";

interface StackedPercentageBarChartProps {
  activityInterval: string;
}

const StackedPercentageBarChart: React.FC<StackedPercentageBarChartProps> = ({activityInterval}) => {
  const [machineState, setMachineState] = useState<Record<string,any>[]>([]);
  const toast = useRef<Toast>(null);
  const fetchData = async () => {
    try {
      if(activityInterval === "10-days") {
        const response = await getMachineState10Days();
        setMachineState(response);
      } else {
        const response = await getMachineStateIntraDays();
        setMachineState(response);
      }
    } catch(error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
          showToast(toast, "error", "Error", error.response.data.message);
      } else {
          showToast(toast, "error", "Error", "Error fetching machine state data");
      }
    }
  }

  useEffect(() => {
    fetchData();
  },[activityInterval])

  const stateMap = {
    "Offline": "hours_0",
    "Online Idle": "hours_1",
    "Online Running": "hours_2",
  };
  const states = Object.keys(stateMap);

  const series = states.map((state, index, arr) => ({
    name: state,
    type: 'bar',
    stack: 'total',
    emphasis: { disabled: true },
    barCategoryGap: '8px',
    itemStyle: {
      borderRadius: index === 0 ? [0, 0, 4, 4] : index === arr.length - 1 ? [4, 4, 0, 0] : 0
    },
    data: machineState.map((d) => d[stateMap[state]]),
  }));

  const option = {
    color: ['#3CA0C9', '#454F63', '#FCA82B', '#A73737','#E4E7EC'],
    legend: { top: 0, show: false },
    grid: { left: 10, right: 10, top: 0, bottom: 40 },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const dateStr = params[0].dataIndex !== undefined
          ? machineState[params[0].dataIndex].date
          : '';

        const [day, month, year] = dateStr.split('.');
        const validDateStr = `${year}-${month}-${day}`;

        const date = new Date(validDateStr);

        const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        const dayName = dayNames[date.getDay()];

        const total = params.reduce((sum: number, p: any) => sum + p.value, 0);
        const header = `${dayName}. ${day}.${month}.${year} <span>(${total}h)<span>`;

        const details = params
          .slice().reverse().map((p: any) => {
            const hours = p.value;
            const percent = ((hours / total) * 100).toFixed(1);
            return `<div class="muct_row"><div>${p.marker} ${p.seriesName}</div><div><span>${percent}%</span></div><div>${hours}<span>h</span></div></div>`;
          })
          .join('');
        return `<div class="machine_uptime_chart_tooltip"><div class="muct_header">${header}</div><div class="muct_details">${details}<div></div>`;
      }
    },
    xAxis: {
      type: 'category',
      axisLine: { show: false },
      data: machineState.map((d) => {
        const [day, month, year] = d.date.split(".");
        const formatted = `${day}.${month}`;
        return formatted;
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
