import {useState, useEffect} from 'react';
import axios from 'axios';
import LogoutButton from '../components/LogoutButton';


function AdminHomepage() {

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
            return;
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



  return (
    <div className='w-screen h-screen flex flex-col items-center justify-center bg-zinc-900'>
        <div className='text-gray-200 text-3xl font-bold'>
            {user ? `Welcome,  ${firstName}` : 'Loading...'}
        </div>



        <LogoutButton/>
    </div>
  )
}

export default AdminHomepage