import { ComingSoon } from '@/components/comingSoon/comingSoon';
import { Greeting } from '@/components/greeting/greeting';
import { Screen } from '@/components/screen/screen';

// Agenda del día: turnos con aceptar, rechazar, reprogramar y completar (F07)
export default function Agenda() {
  return (
    <Screen edges={[]}>
      <Greeting subtitle="Esta es tu agenda" />
      <ComingSoon title="Mi agenda" />
    </Screen>
  );
}
