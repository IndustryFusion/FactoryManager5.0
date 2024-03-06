export  const formatDate=(date:Date)=> {
    const day = date.getDate();
    const month = date.getMonth() + 1; // Months are zero-based
    const year = date.getFullYear();

    return `${day.toString().padStart(2, '0')}/${month
      .toString()
      .padStart(2, '0')}/${year}`;
  }

export const getDatesInRange=(startDate:Date, endDate:Date)=> {
    const dates = [];
    let currentDate = startDate;

    while (currentDate <= endDate) {
      dates.push(formatDate(new Date(currentDate)));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  }