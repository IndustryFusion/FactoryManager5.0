export const machineData = [
  {
    "observedAt": "2024-03-05T15:08:53.823+00:00",
    "modifiedAt": "2024-03-05T14:08:53.823+00:00",
    "entityId": "urn:ngsi-ld:asset:2:101",
    "attributeId": "http://www.industry-fusion.org/fields#machine-state",
    "attributeType": "https://uri.etsi.org/ngsi-ld/Property",
    "datasetId": "urn:ngsi-ld:asset:2:101\\http://www.industry-fusion.org/fields#machine-state",
    "nodeType": "@value",
    "value": "0",
    "valueType": null,
    "index": 0,
    "prev_value": "2"
  },
  {
    "observedAt": "2024-03-05T20:20:38.551+00:00",
    "modifiedAt": "2024-03-05T15:20:38.551+00:00",
    "entityId": "urn:ngsi-ld:asset:2:101",
    "attributeId": "http://www.industry-fusion.org/fields#machine-state",
    "attributeType": "https://uri.etsi.org/ngsi-ld/Property",
    "datasetId": "urn:ngsi-ld:asset:2:101\\http://www.industry-fusion.org/fields#machine-state",
    "nodeType": "@value",
    "value": "2",
    "valueType": null,
    "index": 0,
    "prev_value": "0"
  },
  {
    "observedAt": "2024-03-07T20:00:08.551+00:00",
    "modifiedAt": "2024-03-05T15:20:38.551+00:00",
    "entityId": "urn:ngsi-ld:asset:2:101",
    "attributeId": "http://www.industry-fusion.org/fields#machine-state",
    "attributeType": "https://uri.etsi.org/ngsi-ld/Property",
    "datasetId": "urn:ngsi-ld:asset:2:101\\http://www.industry-fusion.org/fields#machine-state",
    "nodeType": "@value",
    "value": "2",
    "valueType": null,
    "index": 0,
    "prev_value": "0"
  },
  {
    "observedAt": "2024-03-07T22:08:53.823+00:00",
    "modifiedAt": "2024-03-05T14:08:53.823+00:00",
    "entityId": "urn:ngsi-ld:asset:2:101",
    "attributeId": "http://www.industry-fusion.org/fields#machine-state",
    "attributeType": "https://uri.etsi.org/ngsi-ld/Property",
    "datasetId": "urn:ngsi-ld:asset:2:101\\http://www.industry-fusion.org/fields#machine-state",
    "nodeType": "@value",
    "value": "0",
    "valueType": null,
    "index": 0,
    "prev_value": "2"
  },

];


export const formatDate = (date: Date) => {
  const day = date.getDate();
  const month = date.getMonth() + 1; // Months are zero-based
  const year = date.getFullYear();

  return `${day.toString().padStart(2, '0')}/${month
    .toString()
    .padStart(2, '0')}/${year}`;
}

export const getDatesInRange = (startDate: Date, endDate: Date) => {
  const dates = [];
  let currentDate = startDate;

  while (currentDate <= endDate) {
    dates.push(formatDate(new Date(currentDate)));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
}

export const mapBackendDataToAssetState = (backendData: any) => {
  const modifiedObject: any = {};
  // Iterate over the properties of the object
  Object.keys(backendData).forEach((key) => {
    if (key.includes("http://www.industry-fusion.org/fields#")) {
      const newKey = key.replace("http://www.industry-fusion.org/fields#", "");
      modifiedObject[newKey] = backendData[key].type === "Property" ? backendData[key].value : backendData[key];
    } else {
      modifiedObject[key] = backendData[key];
    }
  });
  return modifiedObject;
};

export const convertToSeconds = (timeData: any) => {
  const secondsData = timeData.map((time) => {
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  });
  return secondsData;
}

// Function to calculate the difference between two times
export function calculateDifference(time1, time2) {
  const seconds1 = convertToSecondsTime(time1);
  const seconds2 = convertToSecondsTime(time2);
  return Math.abs(seconds1 - seconds2);
}

// Function to convert seconds to time string format hh:mm:ss
export function convertSecondstoTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}
export function convertToSecondsTime(time) {
  // console.log(typeof time, "time type");
  // const timeValue = typeof time === "number"? time +"" : time;
  // console.log(timeValue , "timehere");
  if (typeof time !== 'string') {
    console.error('Expected a string, but received:', time);
    return 0; // Return a default value or handle the error as appropriate
  }

  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

export const groupedByDate = {};
machineData.forEach(item => {
  const date = item.observedAt.split('T')[0];
  const time = item.observedAt.split('T')[1].split('.')[0];
  if (!groupedByDate[date]) {
    groupedByDate[date] = { online: [], offline: [] };
  }
  if (item.prev_value === "0") {
    groupedByDate[date].offline.push(time);
  } else if (item.prev_value === "2") {
    groupedByDate[date].online.push(time);
  }
});

Object.keys(groupedByDate).forEach(date => {
  const { online, offline } = groupedByDate[date];
  const maxLength = Math.max(online.length, offline.length);
  // Ensure both arrays have the same length
  while (online.length < maxLength) online.push('00:00:00');
  while (offline.length < maxLength) offline.push('00:00:00');
  // Iterate over indices and adjust times
  for (let i = 0; i < maxLength; i++) {
    const onlineTime = convertToSecondsTime(online[i]);
    const offlineTime = convertToSecondsTime(offline[i]);
    const difference = Math.abs(onlineTime - offlineTime);
    console.log(convertSecondstoTime(onlineTime), "onlineTime data");
    console.log(convertSecondstoTime(offlineTime), "offlineTime data");
    console.log(difference, "what's the difference");
    console.log(convertSecondstoTime(difference), "difference timeformat");

    if (onlineTime > offlineTime) {
      online[i] = convertSecondstoTime(difference);
    } else {
      offline[i] = convertSecondstoTime(difference);
    }
  }
});

