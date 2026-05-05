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
          <h2 className="text-2xl font-bold">Динамика популяции</h2>
          <p>
            В симуляции можно включить приток и отток агентов по раундам. При этом 
            `Количество агентов` задает общий пул агентов, а не число тех, кто обязательно
            участвует в каждом раунде. Параметр `Старт активных` задает, сколько агентов из
            этого пула активно в начале, а `Макс активных` ограничивает верхнюю границу
            одновременно активной популяции.
          </p>
          <p className="mt-3">
            Стартовый активный набор выбирается случайно из всего пула. Если в раунде
            случается отток, конкретные уходящие агенты случайно выбираются из текущего
            активного подмножества. Если случается приток, конкретные входящие агенты
            случайно выбираются из неактивной части пула. Таким образом, состав активной
            популяции меняется со временем, но все агенты снизу в блоке настройки по-прежнему
            входят в общий пул симуляции.
          </p>
          <p className="mt-3">
            Число входящих и выходящих агентов задается распределениями. Для прихода
            доступны Пуассон, равномерное, экспоненциальное и гамма-распределение. Для
            ухода дополнительно доступно биномиальное распределение. Для непрерывных
            распределений сэмпл округляется вниз до целого числа агентов.
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
