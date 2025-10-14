import { useEffect, useState } from "react";
import axios from 'axios';

interface Account {
    id: string,
    email: string,
    first_name: string,
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
    console.log("Fetched users:", res.data);
  } catch (err) {
    console.error("Error fetching users:", err);
  }
};





  return (
        <div className="flex flex-col">
            <div className="-m-1.5 overflow-x-auto">
                <div className="p-1.5 min-w-full inline-block align-middle">
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-sky-700">
                                <tr>
                                <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-200 uppercase">Name</th>
                                <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-200 uppercase">Age</th>
                                <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-200 uppercase">Address</th>
                                <th scope="col" className="px-6 py-3 text-end text-xs font-medium text-gray-200 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                <tr>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">John Brown</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">45</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">New York No. 1 Lake Park</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium">
                                        <button type="button" className="inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent text-sky-500 hover:text-sky-400 focus:outline-hidden focus:text-sky-400 disabled:opacity-50 disabled:pointer-events-none">Delete</button>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">John Brown</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">45</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">New York No. 1 Lake Park</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium">
                                        <button type="button" className="inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent text-sky-500 hover:text-sky-400 focus:outline-hidden focus:text-sky-400 disabled:opacity-50 disabled:pointer-events-none">Delete</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
  )
}

export default AccountsTable