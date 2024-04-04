import { Asset } from "@/interfaces/asset-types";
import axios from "axios";

const moment = require('moment');
const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

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

export const findDifference = (givenDateTime:any) => {
  //2024-03-31T11:45:10.573+00:00 
 const givenMoment = moment(givenDateTime);
 const currentMoment = moment();
 const differenceInMilliseconds = currentMoment.diff(givenMoment);
 const duration = moment.duration(differenceInMilliseconds);
  
 // Extract hours, minutes, and seconds
 const hours = Math.trunc(duration.asHours());
 const minutes = Math.trunc(duration.minutes());
 const seconds = Math.trunc(duration.seconds());
 const totalTime =  `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  return totalTime;

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


export const fetchAssets = async (assetId: string) => {
  // console.log(assetId, "getting assetId")
  try {
      const attributeIds: string[] = [];
      const response = await axios.get(API_URL + `/asset/${assetId}`, {
          headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
          },
          withCredentials: true,
      });
      const assetData: Asset = response.data;
      // console.log(assetData, "what's the data");

      Object.keys(assetData).map((key) => {
          if (key.includes("fields")) {
              const newKey = 'eq.' + key;
              attributeIds.push(newKey);
          }
      });
      return attributeIds;
  } catch (error) {
      console.error("Error fetching asset data:", error);
  }
};

 export const getAllDaysOfWeek = (startDate) => {
  let finalDays = [];
  let daysRequired = 6;

  // Start from the given date
  let currentDay = moment(startDate, 'YYYY-MM-DD');
  finalDays.push(currentDay.format('YYYY-MM-DD'));
  for (let i = 0; i < daysRequired; i++) {
      // Add one day to the current day in each iteration
      let day = currentDay.add(1, 'days');
      // Push the formatted date string into the finalDays array
      finalDays.push(day.format('YYYY-MM-DD'));
  }

  // console.log(finalDays);
  return finalDays;
};


export const getWeekHasData = (weeksArrayValue, finalDataValue) => { [{}]
  //finalData: 49days: eachday: value from pgrest // 
  /* {
    finalData:{
      "31/03/2024": [],
      "01/05/2024":[]
    }
  } ***/
  const result = [];
  for (const weekKey in weeksArrayValue[0]) {
      for (const arrayDate of weeksArrayValue[0][weekKey]) {
          if (finalDataValue[arrayDate] && finalDataValue[arrayDate].length > 0) {
              const dateOfValue = moment(finalDataValue[arrayDate][0].observedAt).format('YYYY-MM-DD');
              const time = finalDataValue[arrayDate][0].observedAt.split("T")[1].split(".")[0];
              result.push({
                  weekKey: weekKey,
                  time: time
              });
          }
      }
      
  }
  return result;
}