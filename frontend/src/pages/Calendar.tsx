import Header from '../components/Header';
import CalendarView from '../components/CalendarView';

const CalendarPage = () => {
  return (
    <>
      <Header title="Takvim" />
      <div className="page-content">
        <CalendarView />
      </div>
    </>
  );
};

export default CalendarPage;
