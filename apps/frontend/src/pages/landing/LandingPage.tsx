import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui';

export function LandingPage() {
  const navigate = useNavigate();
  return (
    <div>
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-2xl font-bold">Проблема Эл-фароля</h1>
        <p className="text-sm text-black-500 mb-4">
          Классическая модель поведения агентов в условиях отсутствия детерминированной оптималной стратегии
        </p>
        <Button size="lg" onClick={() => navigate('/simulation')}>
          Запустить симуляцию
        </Button>
      </div>

      <div className="space-y-8 text-black-700">
        <section>
          <h2 className="text-2xl font-bold">Сценарий</h2>
          <p>
            Каждую субботу студенты ФКН решают идти и в Бар Сионист или нет. Баром
            можно наслаждаться, если в нем меньше, чем [capacity]% от общеего числа студентов. 
            Если бар посетит больше, чем данное количество, то он будет переполнен и студентам 
            будет дискомфортно, они будут жалеть, что не поехали домой.

          </p> 
        </section>

        <section>
          <h2 className="text-2xl font-bold">Модель</h2>
          <p>
            Задача отсылает на саму себя:если все считают, что бар будет пустым и все пойдут, 
            то он станет переполненным, что опровергает эту предпосылку. Если все считают, 
            что бар будет переполненным и все останутся дома, то он станет пустым, 
            что также опровергает эту предпосылку.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold">Типы агентов</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                name: 'Random',
                description: 'Посещает бар с вероятностью 50% каждый раунд, не учитывая историю.',
              },
              {
                name: 'Threshold',
                description:
                  "Посещает бар, если в прошлый раз бар был меньше, чем [capacity]% от общеего числа студентов; остается дома в противном случае.",
              },
              {
                name: 'Moving Average',
                description:
                  'Смотрит на посещение в зависимости от среднего значения за последние раунды.',
              },
              {
                name: 'Adaptive',
                description:
                  'Adjusts its probability based on whether recent decisions paid off. Учитывает, было ли предыдущее решение выгодным.',
              },
              {
                name: 'Contrarian',
                description:
                  'Посещает бар, если в прошлый раз бар был больше, чем [capacity]% от общеего числа студентов; остается дома в противном случае.',
              },
              {
                name: 'Trend Follower',
                description:
                  'Смотрит на посещение в зависимости от среднего значения за последние раунды.',
              },
              {
                name: 'Loyal',
                description:
                  'Посещает бар циклически, с периодом [onRounds] раундов посещения и [offRounds] раундов отсутствия.',
              },
              {
                name: 'Regret Minimizing',
                description:
                  'Учитывает, было ли предыдущее решение выгодным и избегает повторения ошибок.',
              },
            ].map(s => (
              <div key={s.name} className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="font-semibold text-gray-900 text-sm mb-1">{s.name}</p>
                <p className="text-gray-500 text-sm">{s.description}</p>
              </div>
            ))}
          </div>
        </section>
        
            
      </div>
      <div className="mt-12">
        <Link to="/simulation">
          <Button size="lg">Запустить симуляцию →</Button>
        </Link>
      </div>
    </div>

  );
}
