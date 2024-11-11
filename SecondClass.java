public class SecretClass {
    private MyClass myClass;
    private int thirdClass;

    private void Foo(){
        MyClass pointer = myClass;
        pointer.Bar();

        ThirdClass pointer2 = new ThirdClass();
         pointer2.Bar();
         pointer2.MyClass();
//Bar looks like wrong
    }
}
