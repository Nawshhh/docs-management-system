import AccountsTable from '../components/AccountsTable'
import { useNavigate } from 'react-router-dom'
import { useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast"; 

function Accounts() {
    
  const navigate = useNavigate();

  const handleHome = () => {
    navigate("/admin-homepage");
  }

    useEffect(() => {
        fetchUserInfo();
    }, []);

    const fetchUserInfo = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            console.log("No token found — user probably logged out");
            toast.error("No permission. Admins only.", {
                style: { background: "#393939", color: "#FFFFFF" },
            });
            navigate("/");
            return;
        }

        try {
            const res = await axios.get("http://localhost:8000/auth/me", {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
            });

            // role check using userData
            if (res.data.data.role !== "ADMIN") {
                toast.error("Access denied. Admins only.", {
                style: { background: "#393939", color: "#FFFFFF" },
                });
                navigate("/");
                return;
            }

        } catch (error: any) {
            console.error("User info failed:", error.response?.data || error.message);
            toast.error("Re-authenticate again", {
                style: { background: "#393939", color: "#FFFFFF" },
            });
            navigate("/");
        }
    };
  
  return (
    <div className='w-screen h-screen flex flex-col items-center justify-center bg-zinc-900 px-20 md:px-80 sm:px-10'>
        <p className='font-semibold text-3xl text-gray-200 mb-10'>Accounts</p>
        <AccountsTable />
        <div className='flex justify-center items-center w-full gap-x-20'>
            <button 
                onClick={handleHome}
                className='mt-5 h-8 px-10 bg-neutral-700 hover:bg-neutral-600 rounded-md text-gray-200 hover:text-gray-300 text-sm cursor-pointer'
            >Back to Home</button>
        </div>
    </div>
  )
}

export default Accounts