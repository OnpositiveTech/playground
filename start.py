class Session:
  def get(self, x):
    return ""

class NotSession:
  def get(self, y):
    return 1

session5 = Session()
resutl = session5.get(123)

class AddYetAnotherClass:
  pass
