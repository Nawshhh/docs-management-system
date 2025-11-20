import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface Account {
    _id: string,
    email: string,
    role: string
}

function ViewEmployeePage() {

    const navigate = useNavigate();

    const location = useLocation();
    const { my_id } = (location.state || {}) as { my_id?: string };
    const [accounts, setAccounts] = useState<Account[] | null>(null);

    const handleHome = () => {
        navigate("/manager-homepage");
    }

    useEffect(() => {
        fetchUserInfo();
        fetchEmployeeData(my_id || "");
    }, []);

    const fetchUserInfo = async () => {
        try {
        const res = await axios.get("http://localhost:8000/auth/me", {
            withCredentials: true,
        });

         

        const { ok, data, error } = res.data;

        if (!ok || !data) {
            await axios.post("http://localhost:8000/auth/page-breach", { page: "MANAGER" });
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
            await axios.post("http://localhost:8000/auth/page-breach", { page: "MANAGER" });
            toast.error("Access denied. Managers only.", {
            style: {
                background: "#393939",
                color: "#FFFFFF",
            },
            });
            navigate("/");
            return;
        }

        } catch (error: any) {
        console.error("User info failed:", error.response?.data || error.message);

        toast.error("Unable to verify permissions.", {
            style: {
            background: "#393939",
            color: "#FFFFFF",
            },
        });
        navigate("/");
        }
    };


    const fetchEmployeeData = async (managerId: string) => {

    try {
        const response = await axios.get(
        `http://localhost:8000/users/manager/${managerId}/employees`,
        {
            withCredentials: true
        }
        );

        const filtered = response.data.data.map((user: any) => ({
        _id: user._id,     
        email: user.email,
        role: user.role,
        }));

        setAccounts(filtered);
    } catch (error) {
        console.error("Error fetching employee data:", error);
        return null;
    }
    };


  return (
    <div className='w-screen h-screen flex flex-col items-center justify-center bg-zinc-900 px-20 md:px-80 sm:px-10'>
        <p className='font-semibold text-3xl text-gray-200 mb-10'>View Scope of Employees</p>
            {/* Account Table */}
            <div className="flex flex-col">
                <div className="-m-1.5 overflow-x-auto">
                    <div className="p-1.5 min-w-full inline-block align-middle">
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-sky-700">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-200 uppercase">ID</th>
                                        <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-200 uppercase">Email</th>
                                        <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-200 uppercase">Role</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {accounts?.map((acc) => (
                                        <tr key={acc._id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">{acc._id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">{acc.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{acc.role}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        <div className='flex justify-center items-center w-full gap-x-20'>
            <button 
                onClick={handleHome}
                className='mt-5 h-8 px-10 bg-neutral-700 hover:bg-neutral-600 rounded-md text-gray-200 hover:text-gray-300 text-sm cursor-pointer'
            >Back to Home</button>
        </div>
    </div>

  )
}

export default ViewEmployeePage