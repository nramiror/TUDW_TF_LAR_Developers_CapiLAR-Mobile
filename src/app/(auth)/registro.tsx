import { ComingSoon } from '@/components/comingSoon/comingSoon';
import { Screen } from '@/components/screen/screen';

// Provisoria: el formulario de registro se hace en PWA-185
export default function Registro() {
  return (
    <Screen edges={['bottom']}>
      <ComingSoon title="Crear cuenta" issue="PWA-185" />
    </Screen>
  );
}
