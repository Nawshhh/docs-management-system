import { useEffect, useState } from "react";
import axios from 'axios';
import toast from "react-hot-toast";

interface Account {
    _id: string,
    email: string,
    role: string
}

function AccountsTable() {

    const [accounts, setAccounts] = useState<Account[] | null>(null);

    useEffect(()=>{
        fetchAccounts()
    },[]);

    const fetchAccounts = async () => {
        try {
            const res = await axios.get("http://localhost:8000/users", {
            withCredentials: true, // optional now
            });
            console.log("Fetched users:", res.data.data[0]);

            const filtered = res.data.data.map((user: any) => ({
                _id: user._id,
                email: user.email,
                role: user.role
            }));

            setAccounts(filtered);
        } catch (err) {
            console.error("Error fetching users:", err);
        }
    };

    useEffect(() => {
    if (accounts) {
        console.log("Updated accounts state:", accounts);
    }
    }, [accounts]);

    const renderSuccessToast = () => {
        toast.success("Successfully Deleted!", {
                style: {
                    background: "#393939",
                    color: "#FFFFFF"
                }
            }
        );
    }

    const deleteAccount = async (_id: string) => {
        
    }

    const handleDelete = async (_id: string) => {
        toast.custom((t) => (
            <div className="bg-slate-800 text-gray-100 p-4 rounded-md shadow-lg flex flex-col gap-3">
            <span>Are you sure you want to delete this account?</span>
            <div className="flex justify-end gap-2">
                <button
                onClick={async () => {
                    toast.dismiss(t.id); // close toast
                    try {
                        const token = localStorage.getItem("token");
                        const response = await axios.delete(`http://localhost:8000/users/${_id}`, {
                            headers: { Authorization: `Bearer ${token}` },
                            withCredentials: true,
                        });
                        console.log("Deleted response: ", response);
                        renderSuccessToast();
                        setAccounts((prev) => prev ? prev.filter(acc => acc._id !== _id) : null);
                    } catch (error: any) {
                        console.error("Error deleting: ", error);
                    }
                }}
                className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded"
                >
                Yes
                </button>
                <button
                onClick={() => toast.dismiss(t.id)}
                className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded"
                >
                Cancel
                </button>
            </div>
            </div>
        ));
    }

  return (
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
                                    <th scope="col" className="px-6 py-3 text-end text-xs font-medium text-gray-200 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {accounts?.map((acc) => (
                                    <tr key={acc._id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">{acc._id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">{acc.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{acc.role}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium">
                                            <button 
                                                type="button" 
                                                onClick={() => handleDelete(acc._id)}
                                                className="inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent text-sky-500 hover:text-sky-400 focus:outline-hidden focus:text-sky-400 disabled:opacity-50">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
  )
}

export default AccountsTable