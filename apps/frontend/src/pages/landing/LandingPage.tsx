import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui';
import { BUILT_IN_AGENT_ORDER, getBuiltInPreset } from '../../agentCatalog';

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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {BUILT_IN_AGENT_ORDER.map((type) => {
              const preset = getBuiltInPreset(type);
              return (
                <div key={preset.label} className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="font-semibold text-gray-900 text-sm mb-2">{preset.label}</p>
                  <p className="text-gray-700 text-sm mb-3">{preset.summary}</p>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>
                      <span className="font-medium text-gray-900">Правило:</span> {preset.formula}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">Параметры по умолчанию:</span>{' '}
                      {preset.parameters.length > 0
                        ? preset.parameters
                            .map((parameter) => `${parameter.label} = ${parameter.defaultValue}`)
                            .join(', ')
                        : 'нет, поведение полностью случайное'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Во всех формулах `capacity` это допустимая посещаемость бара в людях, а `history`
            это массив посещаемости по завершенным раундам.
          </p>
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
