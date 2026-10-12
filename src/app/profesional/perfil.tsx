import { MyServices } from '@/components/myServices/myServices';
import { ProfileView } from '@/components/profileView/profileView';

// Datos del profesional, los servicios que realiza y cerrar sesión (F01)
export default function PerfilProfesional() {
  return (
    <ProfileView>
      <MyServices />
    </ProfileView>
  );
}
