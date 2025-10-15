import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useLocation, useNavigate } from 'react-router-dom'

interface Account {
    _id: string,
    email: string,
    role: string
}

function RolesTable() {
    const [accounts, setAccounts] = useState<Account[] | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [unClickable, setUnclickable] = useState<boolean>(false);
    const location = useLocation();
    const {my_id} = location.state || {};
    const navigate = useNavigate();

    useEffect(()=>{
        fetchAccounts();
        console.log("Received acc_id: ", my_id);
    },[]);

    useEffect(() => {
        if (accounts){
            console.log("Updated accounts state: ", accounts)
        }
    },[accounts]);

    const fetchAccounts = async () => {
        try {
            const res = await axios.get("http://localhost:8000/users",{
                withCredentials: true,
            });
            console.log("Fetched users: ", res.data.data);

            const filtered = res.data.data.map((user: any) => ({
                _id: user._id,
                email: user.email,
                role: user.role,
            }));

            setAccounts(filtered);
        } catch (error: any) {
            console.error("Error fetching users: ", error);
        }
    }

    const handleRoleChange = (new_role: string, old_role: string, acc_id: string) => {
        setUnclickable(!setUnclickable);
        setOpenDropdownId(null);
        apiCall(new_role, old_role, acc_id);
    }

    const apiCall = async (new_role: string, old_role: string, acc_id:string) => {
        console.log("Old Role: ", old_role);
        console.log("New Role: ", new_role);
        console.log("User ID: ", acc_id);

        try {
            const token = localStorage.getItem("token"); // optional if route needs auth
            const res = await axios.patch(`http://localhost:8000/users/${acc_id}/role`,
                { 
                    role: new_role
                },
                {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                withCredentials: true,
                }
            );
            console.log(res);
            toast.success("Role changed successfully!");

        } catch (error: any) {
            console.error("Error updating User Role");
        } finally {

            // exit the account
            if (my_id == acc_id){
                handleLogout();
            }

            fetchAccounts();
            setUnclickable(!setUnclickable);
        }
    }

    const handleLogout = async () => {
        try {
            await axios.post("http://localhost:8000/auth/logout", 
            {}, 
            { withCredentials: true } 
            );

            localStorage.removeItem("token");

            navigate("/");

        } catch (error: any) {
            console.error('Logout failed:', error.response?.data || error.message);
        } 
    };  

  return (
    <div>
        <div className="flex flex-col">
            <div className="-m-1.5 overflow-x-auto">
                <div className="p-1.5 min-w-full inline-block align-middle">
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-sky-700">
                            <tr>
                            <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-200 uppercase">Email</th>
                            <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-200 uppercase">Role</th>
                            <th scope="col" className="px-6 py-3 text-end text-xs font-medium text-gray-200 uppercase">Action</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200">
                            {accounts?.map((acc) => (
                            <tr key={acc._id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">{acc.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{acc.role}</td>

                                <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium relative">
                                {/* Button */}
                                <button
                                    onClick={() =>
                                    setOpenDropdownId(openDropdownId === acc._id ? null : acc._id)
                                    }
                                    className={`text-white bg-sky-700 hover:bg-sky-800 focus:ring-4 focus:outline-none focus:ring-blue-300 
                                            font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center`}
                                    type="button"
                                >
                                    
                                    <svg
                                    className="w-2.5 h-2.5 ms-3"
                                    aria-hidden="true"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 10 6"
                                    >
                                    <path
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="m1 1 4 4 4-4"
                                    />
                                    </svg>
                                </button>

                                {/* Dropdown menu */}
                                {openDropdownId === acc._id && !unClickable && (
                                    <div className="relative right-0 mt-2 z-10 bg-gray-800 divide-y divide-gray-700 rounded-lg shadow-sm w-44">
                                    <ul className="py-2 text-sm text-gray-200">
                                        <li>
                                        <button 
                                            onClick={() => handleRoleChange("ADMIN", acc.role, acc._id)}
                                            className="block w-full text-left px-4 py-2 hover:bg-gray-700">
                                            ADMIN
                                        </button>
                                        </li>
                                        <li>
                                        <button
                                            onClick={() => handleRoleChange("MANAGER", acc.role, acc._id)}
                                            className="block w-full text-left px-4 py-2 hover:bg-gray-700">
                                            MANAGER
                                        </button>
                                        </li>
                                        <li>
                                        <button
                                            onClick={() => handleRoleChange("EMPLOYEE", acc.role, acc._id)}
                                            className="block w-full text-left px-4 py-2 hover:bg-gray-700 ">
                                            EMPLOYEE
                                        </button>
                                        </li>
                                    </ul>
                                    </div>
                                )}
                                </td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
  )
}

export default RolesTable