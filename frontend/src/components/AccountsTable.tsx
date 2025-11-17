import { useEffect, useState } from "react";
import axios from 'axios';

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
  )
}

export default AccountsTable