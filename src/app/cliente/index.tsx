import { ComingSoon } from '@/components/comingSoon/comingSoon';
import { Greeting } from '@/components/greeting/greeting';
import { Screen } from '@/components/screen/screen';

// Catálogo de servicios y reserva de turno (F03)
export default function Reservar() {
  return (
    <Screen edges={[]}>
      <Greeting subtitle="¿Qué te querés hacer?" />
      <ComingSoon title="Reservar turno" issue="PWA-186" />
    </Screen>
  );
}
