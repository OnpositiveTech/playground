class Session:
  def get(self, x):
    return ""

class NotSession:
  def get(self, y):
    return 1

Session = Session()
resutl = Session.get(123)
