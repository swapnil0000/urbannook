import { useState } from "react";
import axios from "axios";
import {useNavigate} from "react-router-dom"
const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [formState, setFormState] = useState({
    msg: "",
    loading: false,
    isSuccess: false,
  });
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  
  const navigate = useNavigate()
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await axios.post(`${apiBaseUrl}/admin/login`, {
      email:formData?.email,
      password:formData?.password,
    },{
      withCredentials:true
    });
    
    if (res?.data?.statusCode == 200 && res?.data?.success) {            
      setFormState({
        msg: res?.data?.data,
        loading: !res?.success,
        isSuccess: res?.data?.success,
      });
      navigate("/admin/dashboard")
    }
  };

  return (
    <div className="w-full max-w-sm p-6 bg-white rounded shadow">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-2xl font-bold mb-4 text-center">Admin Login</h2>
          <input
            type="text"
            name="email"
            placeholder="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />

          <button
            type="submit"
            className="w-full bg-black text-white py-2 rounded hover:bg-gray-800"
          >
            Login
          </button>
        </form>
    </div>
  );
};

export default AdminLogin;
