
import {createSlice } from '@reduxjs/toolkit';

const getLocalStorageItem = (key: string, defaultValue: string) => {
    if (typeof window !== 'undefined') {
       return parseInt(localStorage.getItem(key) || defaultValue, 10);
    }
    return parseInt(defaultValue, 10);
   };

const initialState ={
    user: "",
    timerValue: getLocalStorageItem('timerValue', '0'),
}

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        login: (state, action) => {
          state.user = action.payload;
        },
        logout: (state) => {
          state.user = "";
          state.timerValue = 0;
        },
        startTimer: (state) => {
            state.timerValue += 1; // Increment timer value by 1
            if (typeof window !== 'undefined') {
              localStorage.setItem('timerValue', state.timerValue.toString());
            }
          },
          resetTimer: (state) => {
            state.timerValue = 0; // Reset timer value to 0
          },
      },
});


export const { login, logout, startTimer,resetTimer } = authSlice.actions;

export default authSlice.reducer;