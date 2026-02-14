import PartnerLogin from "@/components/PartnerLogin";

const DeliveryStaffLogin = () => (
  <PartnerLogin
    userType="delivery_staff"
    title="Delivery Staff Login"
    dashboardPath="/delivery-staff/dashboard"
    signupPath="/delivery-staff/signup"
    forgotPath="/delivery-staff/forgot-password"
  />
);

export default DeliveryStaffLogin;
