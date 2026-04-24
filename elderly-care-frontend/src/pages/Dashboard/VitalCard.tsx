interface VitalCardProps {
  title: string;
  value: string;
  status: string;
  icon: React.ReactNode;
  color: string;
}

const VitalCard = ({ title, value, status, icon, color }: VitalCardProps) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center flex-1 min-w-[200px]">
    <h3 className="text-gray-700 font-medium mb-4 text-lg">{title}</h3>
    <div className={`mb-4 ${color}`}>
      {icon}
    </div>
    <div className="text-center">
      <span className="text-3xl font-bold text-gray-800">{value}</span>
      <p className="text-gray-500 font-medium mt-1">({status})</p>
    </div>
  </div>
);

export default VitalCard;