class Session:
  def get(self, x):
    return ""

class NotSession:
  def get(self, y):
    return 1

session = Session()
resutl = session.get(123)
