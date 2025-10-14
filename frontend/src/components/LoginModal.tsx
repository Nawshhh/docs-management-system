import {useState} from 'react';
import axios from 'axios';

function LoginModal() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post("http://127.0.0.1:8000/auth/login", {
        email,
        password,
      });

       console.log('Login successful:', response.data);

       localStorage.setItem("token", response.data.data.access);

    } catch (error: any) {
      console.error('Login failed:', error.response?.data || error.message);
    } finally {
      setLoading(false);
      setEmail("");
      setPassword("");
    }
  };

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
            onChange={(e) => setEmail(e.target.value)}
            placeholder='Enter your username'/>
        </div>
        <div className='flex flex-col gap-y-2'>
          <span className=' text-gray-200'>Password</span>
          <input 
            type="text" 
            className='rounded-md p-1 px-2 border-1 border-neutral-500 text-gray-200'
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder='Enter your password'/>
        </div>
      </div>
      {error && (
        <div className="text-red-400 text-sm mb-2">
          {error}
        </div>
      )}
      <button 
        onClick={handleLogin}
        disabled={loading}
        className='h-8 px-10 bg-sky-700 hover:bg-sky-600 rounded-md text-gray-200 hover:text-gray-300 text-sm cursor-pointer'
        >Log In</button>
    </div>
  )
}

export default LoginModal