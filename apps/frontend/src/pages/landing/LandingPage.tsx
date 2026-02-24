import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui';

export function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-2xl font-bold">Проблема Эл-фароля</h1>
      <Button size="lg" onClick={() => navigate('/simulation')}>
        Запустить симуляцию
      </Button>
    </div>
  );
}
