import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface Logs{
    id: string;
    actor_id: string;
    action: string;
    resource_type: string;
    created_at: string;
}


function LogsTable() {
    const navigate = useNavigate();

    const [logs, setLogs] = useState<Logs[] | null>([]);
    
    useEffect(() => {
        fetchUserInfo();
        fetchLogs();
    },[]);

    const fetchUserInfo = async () => {
        try {
        const res = await axios.get("http://localhost:8000/auth/me", {
            withCredentials: true,
        });

         

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

        if (userData.role !== "ADMIN") {
            toast.error("Access denied. Admins only.", {
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

    const fetchLogs = async () => {
        try {
            const res = await axios.get("http://localhost:8000/logs" , {
                withCredentials: true,
            });

            // console.log("Fetched logs: ", res.data);

            const filtered = res.data.data?.map((log: any) => ({
                id: log.id,
                actor_id: log.actor_id,
                action: log.action,
                resource_type: log.resource_type,
                created_at: log.created_at
            }))

            if (res.data.ok){
                setLogs(filtered);
            } else {
                toast.error(res.data.error || "Failed to load logs");
            }
        } catch (error: any) {
            console.error("Error fetching logs: ", error);
            toast.error("Error fetching logs");
        }
    }

  return (
    <>
        {logs && (
        <div className="flex flex-col">
            <div className="-m-1.5 overflow-x-auto">
                <div className="p-1.5 min-w-full inline-block align-middle">
                    <div className="max-h-80 overflow-y-auto">
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-sky-700">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-200 uppercase">Action</th>
                                        <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-200 uppercase">Actor</th>
                                        <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-200 uppercase">Resource</th>
                                        <th scope="col" className="px-6 py-3 text-end text-xs font-medium text-gray-200 uppercase">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {logs?.map((log) => (
                                        <tr key={log.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">{log.action}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">{log.actor_id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">{log.resource_type}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">{log.created_at}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        )}

        {!logs && (
            <p className='font-semibold text-3xl text-gray-200 mb-10'>No Logs</p>
        )}
        
    </>
  )
}

export default LogsTable