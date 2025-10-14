import {useState, useEffect} from 'react';
import axios from 'axios';
import LogoutButton from '../components/LogoutButton';
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';

function AdminHomepage() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [firstName, setFirstName] = useState<string | null>(null);

    // Fetch user info on component mount
    useEffect(() => {
        fetchUserInfo();
    }, []);

    const fetchUserInfo = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            console.log("No token found — user probably logged out");
            toast.error("No Permission!", {
                    style: {
                        background: "#393939",
                        color: "#FFFFFF"
                    }
                }
            );
            navigate("/");
        }

        try {
            const res = await axios.get("http://localhost:8000/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
            });
            console.log("User info fetched:", res.data.data);
            setUser(res.data.data);
            setFirstName(res.data.data.profile.first_name);
        } catch (error: any) {
            console.error("User info failed:", error.response?.data || error.message);
        }
    };

    const handleButtonClick = (dest: number) => {
        if (dest === 1) navigate("/accounts");
        if (dest === 2) navigate("/roles");
        if (dest === 3) navigate("/system-logs");
        if (dest === 4) navigate("/documents");
    }


  return (
    <div className='w-screen h-screen flex flex-col items-center justify-center bg-zinc-900 px-20 md:px-80 sm:px-10'>
        <div className='text-gray-200 text-3xl font-bold'>
            {user ? `Hello Admin, ${firstName}` : 'Loading...'}
        </div>

        <div className='grid grid-cols-2 gap-6 w-full my-10 text-gray-200 text-xl font-semibold'>
            <button 
                onClick={() => handleButtonClick(1)}
                className='flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-md h-20 cursor-pointer'>
                Accounts
            </button>
            <button  
                onClick={() => handleButtonClick(2)}
                className='flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-md h-20 cursor-pointer'>
                Roles
            </button>
            <button 
                onClick={() => handleButtonClick(3)}
                className='flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-md h-20 cursor-pointer'>
                System Logs
            </button>
            <button  
                onClick={() => handleButtonClick(4)}
                className='flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-md h-20 cursor-pointer'>
                Documents
            </button>
        </div>
        <LogoutButton/>
    </div>
  )
}

export default AdminHomepage