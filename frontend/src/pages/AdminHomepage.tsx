import {useState, useEffect} from 'react';
import axios from 'axios';
import LogoutButton from '../components/LogoutButton';
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';

function AdminHomepage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [firstName, setFirstName] = useState<string | null>("User");
  const [lastName, setLastName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const res = await axios.get("http://localhost:8000/auth/me", {
        withCredentials: true,
      });

      const { ok, data, error } = res.data;

      if (!ok || !data) {
        await axios.post("http://localhost:8000/auth/page-breach", { page: "ADMIN" });
        toast.error(error || "Unable to verify permissions.", {
          style: {
            background: "#393939",
            color: "#FFFFFF",
          },
        });
        navigate("/");
        return;
      } else {
        const userData = data;

        if (userData.role !== "ADMIN") {
          await axios.post("http://localhost:8000/auth/page-breach", { page: "ADMIN" });
          toast.error("Access denied. Admins only.", {
            style: {
              background: "#393939",
              color: "#FFFFFF",
            },
          });
          navigate("/");
          return;
        }

        setUser(userData);
        setFirstName(userData.profile?.first_name || "Admin");
        setLastName(userData.profile?.last_name || "");
      }
    } catch (error: any) {
      console.error("User info failed:", error.response?.data || error.message);
      await axios.post("http://localhost:8000/auth/page-breach", { page: "ADMIN" });
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
    if (dest === 1) navigate("/accounts");
    if (dest === 2) navigate("/roles", { state: { my_id: user.id } });
    if (dest === 3) navigate("/system-logs");
    if (dest === 4) navigate("/assign-scope");
  };

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-zinc-900">
        <span className="text-gray-200 text-xl">Checking admin permissions...</span>
      </div>
    );
  }

  // In case something slipped and user isn't set, safety guard
  if (!user) {
    return null;
  }

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-zinc-900 px-20 md:px-80 sm:px-10">
      <div className="text-gray-200 text-3xl font-bold">
        {`Hello Admin, ${firstName} ${lastName || ""}`}
      </div>

      <div className="grid grid-cols-2 gap-6 w-full my-10 text-gray-200 text-xl font-semibold">
        <button
          onClick={() => handleButtonClick(1)}
          className="flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-md h-20 cursor-pointer"
        >
          Accounts
        </button>
        <button
          onClick={() => handleButtonClick(2)}
          className="flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-md h-20 cursor-pointer"
        >
          Roles
        </button>
        <button
          onClick={() => handleButtonClick(3)}
          className="flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-md h-20 cursor-pointer"
        >
          System Logs
        </button>
        <button
          onClick={() => handleButtonClick(4)}
          className="flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-md h-20 cursor-pointer"
        >
          Assign Scope
        </button>
      </div>

      <LogoutButton />
    </div>
  );
}


export default AdminHomepage