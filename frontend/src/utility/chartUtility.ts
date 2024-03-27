

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

export function convertToSecondsTime(time: string) {
  if (typeof time !== 'string') {
    console.error('Expected a string, but received:', time);
    return 0;
  }
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

export const convertSecondsToTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export const findDifference = (timeValue: any) => {
  console.log("timeValue", convertToSecondsTime(timeValue));
  const assetOnlineTime = convertToSecondsTime(timeValue);
  const currentTimeString = convertToSecondsTime(new Date().toTimeString().slice(0, 8)); // today  currenttime                      
  const difference = Math.abs(assetOnlineTime - currentTimeString);
  const differenceTimeValue = convertSecondsToTime(difference);
  return differenceTimeValue;
}

export const findOnlineAverage = (onlineTime: any) => {
  const sumOfTime = onlineTime.reduce((acc: number, curr: number) => {
    return acc = acc + curr
  }, 0);
  const averageOnline = sumOfTime / (86400 * 7);
  const avgOnlinePercent = Math.round(averageOnline * 100);
  return avgOnlinePercent;

  // console.log("sumOfTime",sumOfTime);
  // console.log("averageOnline ",averageOnline  );
  // console.log("avgOnlinePercent", avgOnlinePercent);
}