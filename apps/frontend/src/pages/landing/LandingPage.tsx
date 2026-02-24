import { Link, Route } from 'react-router-dom';
import { Button } from '../../components/ui';

export function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-2xl font-bold">Проблема Эл-фароля</h1>
      <Button
        variant="primary"
        component={Link}
        to="/simulation"
      >
        Запустить симуляцию
      </Button>
    </div>
  );
}
