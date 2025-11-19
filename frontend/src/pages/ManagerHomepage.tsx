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
        try {
        const res = await axios.get("http://localhost:8000/auth/me", {
            withCredentials: true,
        });

        console.log("Fetched user data:", res.data);

        const { ok, data, error } = res.data;

        if (!ok || !data) {
            toast.error(error || "Unable to verify permissions.", {
            style: {
                background: "#393939",
                color: "#FFFFFF",
            },
            });
            navigate("/");
            return;
        }

        const userData = data;

        if (userData.role !== "MANAGER") {
            toast.error("Access denied. Manager only.", {
            style: {
                background: "#393939",
                color: "#FFFFFF",
            },
            });
            navigate("/");
            return;
        }

        setUser(userData);
        setFirstName(userData.profile?.first_name || "Manager");
        } catch (error: any) {
        console.error("User info failed:", error.response?.data || error.message);

        toast.error("Unable to verify permissions.", {
            style: {
            background: "#393939",
            color: "#FFFFFF",
            },
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