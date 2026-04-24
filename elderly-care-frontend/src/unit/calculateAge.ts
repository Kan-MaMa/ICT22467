export const calculateAge = (birthDateString: string): number => {
  const today = new Date();
  const birthDate = new Date(birthDateString);
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  
  // ถ้ายังไม่ถึงเดือนเกิด หรือถึงเดือนเกิดแล้วแต่ยังไม่ถึงวันเกิด ให้ลบอายุออก 1 ปี
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};