public class SecondClass {
    private MyClass myClass;

    private void Foo(){
        MyClass pointer = myClass;
        pointer.Bar();

        ThirdClass pointer2 = new ThirdClass();
         pointer2.Bar();

    }
}
