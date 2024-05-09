import React, { useState, useRef, useEffect } from "react";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Toast } from "primereact/toast";
import authService from "@/auth/auth-service";
import Cookies from 'js-cookie';
import "primereact/resources/themes/bootstrap4-light-blue/theme.css";
import "primeflex/primeflex.css";
import { Password } from 'primereact/password';
import "../styles/login.css";
import 'primeicons/primeicons.css';
import { redirect, useRouter } from 'next/navigation';
import { useDispatch } from "react-redux";
import { login, startTimer } from "@/state/auth/authSlice";


//interface for token
interface LoginResponse {
  access_token: string;
  refresh_token: string;
  sessionId: string;
}

const Login: React.FC = () => {
  // states
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [usernameValid, setUsernameValid] = useState<boolean>(true);
  const [passwordValid, setPasswordValid] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const toast = useRef<Toast>(null);
  const router = useRouter();
  const dispatch = useDispatch();

  useEffect(() => {
    // Always do navigations after the first render
    // isLoggedIn && router.push('/factory-site/factory-overview');
    if (Cookies.get("login_flag") === "true") {
      router.push("/factory-site/factory-overview");
    } else {    
        router.push("/login");    
    }
  }, [])

  // validate username, it should be  Alpha Numeric includes underscore _
  const validateUsername = (value: string): boolean => {
    let regex = new RegExp('[a-z0-9]+@[a-z]+\.[a-z]{2,3}');
    const isValid = regex.test(value);
    setUsernameValid(isValid);
    return isValid;
  }; 

  //validate password, minimum 8 characters
  const validatePassword = (value: string): boolean => {
    const isValid =
      value.length >= 8 &&
      /[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(value);
    setPasswordValid(isValid);
    return isValid;
  };

  // Update username state and validate
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    validateUsername(value);
  };

  // Update password state and validate
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    validatePassword(value);
  };

  // validate username and password
  const handleLogin = async () => {
    if (!validateUsername(username) || !validatePassword(password)) {
      toast.current?.show({
        severity: "error",
        summary: "Validation Error",
        detail: "Please check your credentials!",
      });
      return;
    } else {
      try {
        const data: LoginResponse = await authService.login(username, password);
      
        dispatch(login(username));
        dispatch(startTimer());
        Cookies.set("connect.sid", data.sessionId, { expires: 7 });
        toast.current?.show({
          severity: "success",
          summary: "Login Successful",
          detail: "Welcome!",
        });
        setIsLoggedIn(true);
        router.push('/factory-site/factory-overview');
      } catch (err) {
        toast.current?.show({
          severity: "error",
          summary: "Login Error",
          detail: "Failed to login",
        });
      }
  }
  };

  //Function to get tooltip error message for username
  const getUsernameTooltip = (): string | undefined => {
    if (!usernameValid && username) {
      return "Username must be an valid emalid";
    }
    return undefined;
  };

  // Function to get tooltip error message for password
  const getPasswordTooltip = (): string | undefined => {
    if (!passwordValid && password) {
      return "Password must be greater than 8 characters";
    }
    return undefined;
  };
  return (
    <div className="flex flex-row justify-content-center align-content-center surface-ground" style={{minHeight:"calc(100vh - 20px)"}}>
      <Toast ref={toast} />
      {isLoggedIn ? (
        <h1>Welcome</h1>
              ) : (
        <>
        <Card className="flex login-card" style={{ marginTop:"50px", width:"500px", height:"600px"}}>
          <h1 style={{color:"#363535d1",marginLeft:"1rem",marginTop:"-10px"}}> Factory Manager 5.0 </h1>
        </Card> 
        <Card  className="flex"
        style={{color:"balck", marginTop:"50px", width:"500px", height:"600px"}}>
          <h2 style={{color:"black", marginTop:"80px", marginLeft:"150px"}}> Login </h2>
          <div className="flex flex-column gap-2 mb-2" style={{marginLeft:"50px", marginTop:"50px"}}>
            <label htmlFor="username" className="mb-1">
              Username
            </label>
            <InputText
              id="username"
              value={username}
              keyfilter="email"
              onChange={handleUsernameChange}
              className={`${!usernameValid ? "p-invalid" : ""}`}
              onBlur={() => validateUsername(username)}
              aria-describedby="username-help"
              style={{width:"20rem"}}
            />
            {!usernameValid &&
            <small id="username-help">
              {getUsernameTooltip()}
            </small> }
          </div>
          <div className="flex flex-column gap-2 mb-2" style={{marginLeft:"50px", marginTop:"20px"}} >
            <label htmlFor="password" className="p-mb-1">
              Password
            </label>
            <Password value={password} className={`${!passwordValid ? "p-invalid" : ""}`}
              toggleMask
              onChange={(handlePasswordChange)}
              inputStyle={{width:"20rem"}}/>
            <small id="password-help">
              {getPasswordTooltip()}
            </small>
          </div>

          <div className="flex" style={{marginTop:"3rem", marginLeft:"9rem"}}>
          <Button
            label="Cancel"
            onClick={handleLogin}
            text raised
            severity="secondary"
            style={{width:"6rem"}}
          />
          <Button
            label="Submit"
            onClick={handleLogin}
            raised
            disabled={!usernameValid || !passwordValid || !username || !password}
            style={{marginLeft:"2rem", width:"6rem"}}
          />
          </div>
          
        </Card>
        </>
     )}
    </div>
  );
};

export default Login;