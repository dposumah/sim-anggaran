import { Construction } from 'lucide-react';

export default function UnderConstruction({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-blue-50 p-6 rounded-full mb-6">
        <Construction className="w-16 h-16 text-primary" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Halaman {title}</h1>
      <p className="text-gray-500 max-w-md">
        Fitur ini sedang dalam tahap pengembangan dan akan tersedia pada rilis aplikasi berikutnya.
      </p>
    </div>
  );
}
