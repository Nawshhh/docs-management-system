import {useEffect, useState} from 'react'
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from "react-router-dom";

import LogoutButton from '../components/LogoutButton';

type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";

interface UserProfile {
  first_name: string;
  last_name?: string;
}

interface User {
  id: string;
  role: Role;
  profile?: UserProfile;
}


function ManagerHomepage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState<string>("Manager");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("No token found — user probably logged out");
      toast.error("No permission. Managers only.", {
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

      const userData: User = res.data.data;
      console.log("User info fetched:", userData.id);

        // 👇 store my_id in localStorage
        if (userData?.id) {
        localStorage.setItem("my_id", userData.id);
        }

      // role check using userData
      if (userData.role !== "MANAGER") {
        toast.error("Access denied. Managers only.", {
          style: { background: "#393939", color: "#FFFFFF" },
        });
        navigate("/");
        return;
      }

      setUser(userData);
      setFirstName(userData.profile?.first_name || "Manager");
    } catch (error: any) {
      console.error("User info failed:", error.response?.data || error.message);
        toast.error("Re-authenticate again", {
          style: { background: "#393939", color: "#FFFFFF" },
        });
        navigate("/");
    } finally {
      setLoading(false);
    }
  };

    const handleButtonClick = (dest: number) => {
        if (dest === 1) navigate("/view-scope", { state: { my_id: user!.id } });
        if (dest === 2) navigate("/documents", { state: { my_id: user!.id } });
    };

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-zinc-900">
        <span className="text-gray-200 text-xl">Checking manager permissions...</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-zinc-900 px-20 md:px-80 sm:px-10">
      <div className="text-gray-200 text-3xl font-bold">
        {`Hello Manager, ${firstName} ${user.profile?.last_name || ""}`}
      </div>

      <div className="grid grid-cols-2 gap-6 w-full my-10 text-gray-200 text-xl font-semibold">
        <button
            onClick={() => handleButtonClick(1)}
          className="flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-md h-20 cursor-pointer"
        >
          View Employee Scope
        </button>
        <button
            onClick={() => handleButtonClick(2)}
          className="flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-md h-20 cursor-pointer"
        >
          Documents
        </button>
      </div>

      <LogoutButton />
    </div>
  );
}


export default ManagerHomepage