# The hilvl programming language

Hilvl is a programming language that is versatile but with a very small syntax. All code in hilvl are **single-argument** invocations of **actions** that belong to **services**.

Services are the fundamental building blocks of a hilvl program. And the name hilvl reflects how this is a higher level of abstraction than objects and functions.

[Try it online (REPL)](http://holgerl.github.io/hilvl/)

### Example of hilvl

*(If you don't get this, skip to [the chapters below](https://github.com/holgerl/hilvl#structure-of-the-hilvl-language).)*

<!-- test-example1.hl -->
```javascript
@ var foo = 42
@ var bar = (2 + 40)
	
@ . foo == (@ . bar) then
	@ set foo = 0
	
@ var myList = 
	1
	2
	3
	
@ . myList loop
	@ set foo = (@ . foo + (@ . element))

@ var myMap =
	Map of
		"firstname" , "Ola"
		"lastname" , "Nordmann"

@ var MyService := 
	@ var myAction :
		@ . argument + 10
		
MyService myAction (@ . foo) // foo is now 6, and this returns 16
```
	
## Structure of the hilvl language

### Service, action and argument

All statements in hilvl are invocations of single argument actions that are part of some service:

```javascript
Service action argument
```

For instance:

```javascript
TextUtil makeUppercase "hello"
ScoreKeeper add 10
```

The magic happens when an action returns another service that can be called in a chain:

```javascript
SandwichMaker makeNewSandwich "cheese" addSome "tomato"
```

<img src="https://github.com/holgerl/hilvl/raw/master/notes/hilvl-example-1.png" alt="hilvl syntax tree" width="600">

Services can of course be arguments to other actions:

```javascript
Chooser makeChoice (StrategyMaker mustBeLargerThan 10)
```

<img src="https://github.com/holgerl/hilvl/raw/master/notes/hilvl-example-2.png" alt="hilvl syntax tree" width="600">

### It is all services

Everything is a service in hilvl, even strings and numbers. And action names can be anything. This means that even this is an ordinary action invocation:

```javascript
2 + 40
```

Here, `2` is the service, `+` is the action and `40` is the argument. This action returns a new service `42`

There are only 8 reserved symbols in hilvl:

`"` `(` `)` `//` `true` `false` `(numbers)` `(whitespace)`

The rest are services and actions defined by either the user or the system. This means that all other characters can be used when defining an API. (Allthough, you probably don't want to use the same name as a system service.) 

Here is an example that uses unusal action and service names:

```javascript
@ set myVariableName = 42
```

Here, `@` is the service, `set` is the action and `myVariableName` is the argument. This returns a new service which has an action `=` that is called with `42` as an argument. `@` is actually a system service for handling scope. There is more about that later.

#### Creating a service

Since everything is a service. It is easy to make your own. The last statement of an action is the return value:

<!-- test-example7.hl -->
```javascript
// Creating a new service with an action:
@ var MyService := 
	@ var myAction :
		@ var myVariable = (42 + (@.argument))
		@.myVariable // This is the return value
		
MyService myAction 1 // Using the service

//result: 43
```

#### Importance of parantheses

There is no precedence in hilvl. This means that parantheses may be necessary to group arguments correctly:

```javascript
@ set myVar = 2 + 40     // This fails during runtime!
```

This is wrong because the action named `=` will take `2` as its argument, but the resulting service will not have an action named `+`. The correct way is to group `2 + 40` to a single argument for the `=` action:

```javascript
@ set myVar = (2 + 40)
```

#### Intendation and lists

Every action takes only 1 argument, but that argument can be a list. Whitespace intendation is used to declare a list:

```javascript
MyUtil sort
	4
	2
	9
	3
```
	
Here, the argument is the list `[4,2,9,3]`.

Why use whitespace for this you ask? The point is that if you make a list of *statements*, then you have a block of code. All code in hilvl are lists of statements that can be passed around and invoked by other code.

Here is an example:

```javascript
KeyboardService onEvent
	Player move "up"
	Time increase 1
	CollisionControl doCheck _
```

Here, the implementation of `onEvent` may decide itself when to evaluate the statements in the argument.

##### Empty lists

If the argument is ommitted entirely, it is interpreted as an empty list:

```javascript
// This is an empty list:
@ var emptyList =

// The same applies inside parantheses:
(MyService setValue) doSomething 42
```

### Syntactic sugar

To make the code more readable, a very simple shortcut is supported in the syntax:

`foo.bar` is the same as `foo. bar` is the same as `foo . bar`

`foo,bar` is the same as `foo, bar` is the same as `foo , bar`

This means that the `.` and `,` are action names even though there are no space around them. This is only for these actions. All other services, actions and arguments must have spaces between them. This is because they can be called anything except the reserved symbols, and this in turn is why hilvl is very versatile and can used for implementing domain specific languages.

Syntactic sugar is considered to be evil, so this is the only sugar in hilvl.

### Variables, scope and evaluation

The `Service action argument` structure and indentation based lists are combined with the scope system for great flexibility for the programmer.

Variables are created, changed and read by using the scope service `@`:

<!-- test-example4.hl -->
```javascript
@ var myVar // variable "myVar" is declared
@ set myVar = 42 // myVar is given a value
@ var myOtherVar = 10 // the variable service also has an = action for more consise code
@.myVar + (@.myOtherVar) // the values of myVar and myOtherVar are read and added together

//result: 52
```

All variables are saved in the same scope. But to add a new nested scope, there is an action named `:=` on the variable service:

<!-- test-example5.hl -->
```javascript
@ var myVar1 = 1
@ var myVar2 = 2

@ var myScope := // the two statements in the argument are now evaluated in a new scope:
	@ var myVar1 = 10
	@ set myVar2 = 20
	
// we place the variables in a list that is returned as the result:
@ var myList =
	@.myVar1
	@.myVar2

//result: [1, 20]
```

Notice how `myVar1` kept its value because the change to `10` was done on a new variable with the same name in the inner scope. `myVar2` on the other hand, was not redeclared in the inner scope, and its value was thus changed to `20`. 

The scopes are nested, which means that if a variable is used, its value will be searched for upwards in all parent scopes.

After adding a new scope, the `:=` action acts exactly like the `=` action, and evalates the argument list. This means that any statements in the argument gets executed. And in the example above, this meant that the variables where changed.

But it is possible to set a value to a variable *without* evaluating the arguments. This is useful when we want to execute a block of code at a later time, or many times over. This is also the key mechanism for structuring code as services and actions. 

It is done with the action `:`:

<!-- test-example6.hl -->
```javascript
@ var bar = 1
	
@ var foo : // the statement in the argument is not evaluated yet
	@ set bar = 2
	
@ var barBefore = (@.bar)
	
@ foo // this invokes the foo action with an empty argument, and the code is evaluated

@ var barAfter = (@.bar)

@ var results =
	@.barBefore
	@.barAfter

//result: [1, 2]
```

If a list of statements is executed, the value of the *last* statement is returned from the action. All hilvl code are lists of statements, so this is why the last value is always the result in the examples. 

## Services and actions provided out-of-the-box

The hilvl runtime provides several useful services in addition to the scope service. These are called system services because their functionality can not be made in hilvl by itself. Hilvl also comes with a standard library implemented in the language itself, providing some useful services.

### String

```javascript
"foo" + "bar" == "foobar"
"Hello!" length _ == 6
"Hello!" at 1 substringTo 4 == "ell"
"Hello !" at 6 insert "World" == "Hello World!"
"foo" == "bar" == false
```

### Number

```javascript
	1 + 2 - 3 == 0
	10 > 4 == true == (4 < 10)
	123 as string == "123"

	@ var n = 0
	10 until
		@ set n = (@.n + 1) // This will run 10 times
```

### Boolean

```javascript
	1 < 2 == true
	false != true
	
	@.n < 10 then
		MyService myAction // This will run if n is lower than 10
```

### List

```javascript
@ var myList = 
	40
	41
	42
@.myList get 1 == 41

@ var emptyList = 
	
@.myList loop
	@.emptyList push (@.element) // This will run once for every element in myList
```

#### The `,` action

There is a convenient action ',' on strings, numbers and booleans. It returns a list containing the value and the argument:

```javascript
1, 2 // This is the list [1,2]
"one", "two" // This is the list ["one","two"]
true, false // This is the list [true,false]
```

A clever trick is that the List service also has a `,` action that returns a new list with the argument added. So this is possible:

```javascript
@ var myList = ("foo", "bar", "baz")
```

### Map

```javascript
@ var myPlayer = 
	Map of  
		"name", "Holger"
		"score", 120
		"alive", true

myPlayer put ("score", 121)
myPlayer get "name"

@ var emptyMap = (Map of)
```

### IO 

The `IO` service handles input and output to and from systems outside the hilvl runtime environment.

```javascript
IO print "This will be printed in the console"

@ var fileContents = (IO readFile "myfolder/myfile.txt")
```

## Advanced examples of hilvl

#### Recursion

<!-- test-recursive1.hl -->
```javascript
@ var counter = 0
	
@ var recursiveAction :
	@.counter < 5 then
		@ set counter = (@.counter + 1)
		@ recursiveAction
	@.counter
	
@ recursiveAction

//result: 5
```

#### Scope and higher-order programming

<!-- test-example2.hl -->
```javascript
@ var foo = 10 // Variable in outer scope

@ var MyService := 
	@ var myAction :
		@ set foo = 42 // Variable in inner scope
		@ var myFunction : (@.argument) // Saving argument without evaluating it
		@ myFunction // Invoking the argument as an action
		
@ var bar = 
	MyService myAction (@.foo + 2) // Argument is evaluated before action is invocated
	MyService myAction // Argument is evaluated on demand by the myAction implementation
		@.foo + 2
	MyService myAction 
		@ set foo = 50 // The inner scope is active during on demand evaluation
		@.foo + 2
		
/*result
[12, 44, 52]
*/
```

#### Fluent programming

<!-- test-example3.hl -->
```javascript
@ var Please := 
	@ var add :
		@ var arg1 = (@.argument)
		@.Please // Returning the service itself
	@ var and :
		@ var arg2 = (@.argument)
		@.Please // Returning the service itself
	@ var andThen :
		@.arg1 + (@.arg2) + (@.argument)
		
Please add 42 and 50 andThen 100
	
//result: 192
```

### How to run hilvl

To run a file with hilvl code: `node src/hl.js myFile.hl`
	
To run all tests: `node test/run-all-tests.js`

To run HiTTP web framework: `node src/HiTTP.js examples/todo-webapp/backend.hl`