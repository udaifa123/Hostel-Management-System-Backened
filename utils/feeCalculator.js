export const calculateFee = (data) => {
  const {
    rent = 0,
    food = 0,
    electricity = 0,
    extra = 0,
    attendancePercentage = 100,
    dueDate
  } = data;


  const subtotal = rent + food + electricity + extra;


  let attendanceFine = 0;
  if (attendancePercentage < 75) {
    const shortfall = 75 - attendancePercentage;
    attendanceFine = shortfall * 10; 
  }

  
  let lateFine = 0;
  const today = new Date();
  const due = new Date(dueDate);
  if (today > due) {
    const daysLate = Math.floor((today - due) / (1000 * 60 * 60 * 24));
    lateFine = daysLate * 20; 
  }


  const totalAmount = subtotal + attendanceFine + lateFine;

  return {
    subtotal,
    attendanceFine,
    lateFine,
    totalAmount
  };
};

export const getStatus = (paidAmount, totalAmount, dueDate) => {
  const today = new Date();
  const due = new Date(dueDate);
  
  if (paidAmount >= totalAmount) return 'paid';
  if (paidAmount > 0) return 'partial';
  if (today > due) return 'overdue';
  return 'pending';
};