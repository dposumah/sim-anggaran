'use client';

import { useState, useEffect } from 'react';
import { useYear } from '@/contexts/YearContext';

export default function UsersPage() {
  const { tahun } = useYear();
  const [users, setUsers] = useState<any[]>([]);
  const [skpds, setSkpds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    namaLengkap: '',
    role: 'STAF',
    password: '',
    skpdId: '',
    isActive: true,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users?tahunId=${tahun || ''}`);
      const data = await res.json();
      if (data.data) {
        setUsers(data.data);
      }

      if (tahun) {
        const resSkpd = await fetch(`/api/skpd?tahunId=${tahun}`);
        const dataSkpd = await resSkpd.json();
        if (dataSkpd.data) {
          setSkpds(dataSkpd.data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tahun]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!editingUser;
      const url = isEdit ? `/api/users/${editingUser.id}` : `/api/users`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      } else {
        alert(data.error || 'Terjadi kesalahan');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus user ini?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal menghapus user');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      username: '',
      namaLengkap: '',
      role: 'STAF',
      password: '',
      skpdId: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      username: user.username,
      namaLengkap: user.namaLengkap,
      role: user.role,
      password: '', // do not show existing password
      skpdId: user.skpdId ? String(user.skpdId) : '',
      isActive: user.isActive,
    });
    setIsModalOpen(true);
  };

  const toggleStatus = async (user: any) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Manajemen User</h1>
          <p className="text-sm text-gray-500">Kelola pengguna yang memiliki akses ke aplikasi</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 bg-primary text-white shadow hover:bg-primary/90 h-9 px-4 py-2"
        >
          Tambah User
        </button>
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Email</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Nama Lengkap</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Role</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">SKPD</th>
              <th className="px-6 py-3 text-center font-medium text-gray-500">Status</th>
              <th className="px-6 py-3 text-right font-medium text-gray-500">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                  Memuat data...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                  Belum ada data user.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{user.email}</div>
                    <div className="text-xs text-gray-500">@{user.username}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">{user.namaLengkap}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-700 truncate max-w-xs">
                    {user.skpd?.nama || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button 
                      onClick={() => toggleStatus(user)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                        user.isActive ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {user.isActive ? 'Aktif' : 'Non-Aktif'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium space-x-3">
                    <button
                      onClick={() => openEditModal(user)}
                      className="text-primary hover:text-primary-hover"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium">{editingUser ? 'Edit User' : 'Tambah User'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    required
                    disabled={!!editingUser}
                    className="w-full px-3 py-2 border rounded-md text-sm disabled:bg-gray-100 disabled:text-gray-500"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Username *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingUser}
                    className="w-full px-3 py-2 border rounded-md text-sm disabled:bg-gray-100 disabled:text-gray-500"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  value={formData.namaLengkap}
                  onChange={(e) => setFormData({ ...formData, namaLengkap: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Role *</label>
                  <select
                    required
                    className="w-full px-3 py-2 border rounded-md text-sm bg-white"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="STAF">STAF</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Password (Opsional)</label>
                  <input
                    type="password"
                    placeholder={editingUser ? "(Kosongkan jika tak diubah)" : "Password untuk manual login"}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>

              {formData.role !== 'ADMIN' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">SKPD (Untuk Staf) *</label>
                  <select
                    required={formData.role !== 'ADMIN'}
                    className="w-full px-3 py-2 border rounded-md text-sm bg-white"
                    value={formData.skpdId}
                    onChange={(e) => setFormData({ ...formData, skpdId: e.target.value })}
                  >
                    <option value="">-- Pilih SKPD --</option>
                    {skpds.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.kode} - {s.nama}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-hover shadow-sm"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
