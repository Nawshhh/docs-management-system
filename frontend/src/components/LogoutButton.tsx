import axios from 'axios';
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';

function LogoutButton() {
    const navigate = useNavigate();

  const handleLogout = async () => {
    try {
        await axios.post("http://localhost:8000/auth/logout", 
        {}, 
        { withCredentials: true } 
        );

        // console.log('Logout successful:', response.data);

        toast.success("Successfully Logged Out!", {
                style: {
                    background: "#393939",
                    color: "#FFFFFF"
                }
            }
        );

        navigate("/");

    } catch (error: any) {
        console.error('Logout failed:', error.response?.data || error.message);
    } 
  };    

  return (
        <button 
        onClick={handleLogout}
        className='h-8 px-10 bg-sky-700 hover:bg-sky-600 rounded-md text-gray-200 hover:text-gray-300 text-sm cursor-pointer'
        >Log Out</button>
  )
}

export default LogoutButton