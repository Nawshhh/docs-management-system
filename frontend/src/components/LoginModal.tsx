import {useState} from 'react';
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';



function LoginModal() {
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post("http://localhost:8000/auth/login", 
        { email, password},
        { withCredentials: true }
      );

      const { ok, data, error } = response.data;

      if (!ok) {
        setError(error || "Login failed.");
        return;
      }

      const lastUse = data?.last_use;

      if (lastUse?.at) {
        const date = new Date(lastUse.at);
        const statusText = lastUse.success ? "successful" : "failed";
        const ipText = lastUse.ip ? ` from IP ${lastUse.ip}` : "";

        toast(`Last account use: ${date.toLocaleString()} (${statusText}${ipText}).`, {
          style: {
            background: "#393939",
            color: "#ffffff",
            borderRadius: "8px",
            padding: "12px 16px",
          },
          icon: lastUse.success ? "🟢" : "🔴",
        });
      }

        if (data.user.role === "ADMIN") {
          navigate("/admin-homepage");
        } else if (data.user.role === "MANAGER") {
          navigate("/manager-homepage");
          return;
        } else {
          navigate("/employee-homepage");
        }
      
    } catch (err: any) {
      const backendError = err.response?.data?.error;
      console.error("Login failed:", err.response?.data || err.message);
      setError(backendError || "Could not log in.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = () => {
    console.log("Routing to create account");
    navigate("/create-account");
  }

  const handleForgotPassword = () => {
    console.log("Routing to forgot password");
    navigate("/forgot-password");
  }

  return (
    <div className='h-auto w-auto py-8 px-8 rounded-md flex flex-col items-center justify-center'>
      <div className='grid-rows-2 gap-x-8 w-full h-full mb-8'>
        <div className="w-full flex flex-col text-center mb-4 text-gray-200 text-3xl font-bold">D M S</div>
        <div className='flex flex-col gap-y-2 mb-4 w-xs'>
          <span className=' text-gray-200'>Email</span>
          <input
            type="text" 
            className='rounded-md p-1 px-2 border-1 border-neutral-500 text-gray-200 font-light'
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}/>
        </div>
        <div className='flex flex-col gap-y-2'>
          <span className=' text-gray-200'>Password</span>
          <input 
            type="password" 
            className='rounded-md p-1 px-2 border-1 border-neutral-500 text-gray-200'
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}/>
        </div>
      </div>
      {error && (
        <div className="text-red-400 text-sm mb-2">
          {error}
        </div>
      )}
        <div className='flex flex-row gap-x-2'>
      <button 
        onClick={handleLogin}
        disabled={loading}
        className='h-8 px-10 bg-sky-700 hover:bg-sky-600 rounded-md text-gray-200 hover:text-gray-300 text-sm cursor-pointer'
        >Log In</button>
      <button 
        onClick={handleForgotPassword}
        disabled={loading}
        className='h-8 px-6 bg-sky-700 hover:bg-sky-600 rounded-md text-gray-200 hover:text-gray-300 text-sm cursor-pointer'
        >Forgot Password</button>
        </div>

      <button 
        onClick={handleCreateAccount}
        className='mt-5 h-8 px-10 bg-sky-700 hover:bg-sky-600 rounded-md text-gray-200 hover:text-gray-300 text-sm cursor-pointer'
        >Create Account</button>
    </div>
  )
}

export default LoginModal