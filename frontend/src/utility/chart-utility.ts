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
  const secondsData = timeData.map((time: string) => {
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

