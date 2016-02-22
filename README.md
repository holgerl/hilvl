# The hilvl programming language

Hilvl is a programming language that is versatile but with a very small syntax. All code in hilvl are **single-argument** invocations of **actions** that belong to **services**.

Services are the fundamental building blocks of a hilvl program. And the name hilvl reflects how this is a higher level of abstraction than objects and functions.

Try the [online evaluator](http://holgerl.github.io/hilvl/)

### Example of hilvl

*(If you don't get this, skip to [the chapters below](https://github.com/holgerl/hilvl#structure-of-the-hilvl-language).)*

<!-- test-example1.hl -->
```javascript
// Note: @ is the name of a system defined service

@ new foo = 42
@ new bar = (2 + 40)
	
@ . foo == (@ . bar) then
	@ set foo = 0
	
@ new myArray = 
	1
	2
	3
	
@ . myArray loop
	@ set foo = (@ . foo + (@ . element))

@ new MyService @ 
	@ new myAction :
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

There are only 5 reserved symbols:

`"` `whitespace` `(` `)` `//`

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
@ new MyService @ 
	@ new myAction :
		@ new myVariable = (42 + (@.argument))
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

#### Intendation and arrays

Every action takes only 1 argument, but that argument can be an array. Whitespace intendation is used to declare an array:

```javascript
MyUtil sort
	4
	2
	9
	3
```
	
Here, the argument is the array `[4,2,9,3]`.

Why use whitespace for this you ask? The point is that if you make an array of *statements*, then you have a block of code. All code in hilvl are arrays of statements that can be passed around and invoked by other code.

Here is an example:

```javascript
KeyboardService onEvent
	Player move "up"
	Time increase 1
	CollisionControl doCheck _
```

Here, the implementation of `onEvent` may decide itself when to evaluate the statements in the argument.

### Syntactic sugar

To make the code more readable, a special shortcut is supported in the syntax:

`foo.bar` is the same as  `foo . bar`

This means that the `.` is an action name even though there is no space around it. This is only for the `.` action. All other services, actions and arguments must have spaces between them. This is because they can be called anything except the reserved symbols, and this in turn is why hilvl is very versatile and can used for implementing domain specific languages.

### Variables, scope and evaluation

The `Service action argument` structure and indentation based arrays are combined with the scope system for great flexibility for the programmer.

Variables are created, changed and read by using the scope service `@`:

<!-- test-example4.hl -->
```javascript
@ new myVar // variable "myVar" is declared
@ set myVar = 42 // myVar is given a value
@ new myOtherVar = 10 // the variable service also has an = action for more consise code
@.myVar + (@.myOtherVar) // the values of myVar and myOtherVar are read and added together

//result: 52
```

All variables are saved in the same scope. But to add a new nested scope, there is an action named `@` on the variable service:

<!-- test-example5.hl -->
```javascript
@ new myVar1 = 1
@ new myVar2 = 2

@ new myScope @ // the two statements in the argument are now evaluated in a new scope:
	@ new myVar1 = 10
	@ set myVar2 = 20
	
// we place the variables in an array that is returned as the result:
@ new myArray =
	@.myVar1
	@.myVar2

//result: [1, 20]
```

Notice how `myVar1` kept its value because the change to `10` was done on a new variable with the same name in the inner scope. `myVar2` on the other hand, was not redeclared in the inner scope, and its value was thus changed to `20`. 

The scopes are nested, which means that if a variable is used, its value will be searched for upwards in all parent scopes.

After adding a new scope, the `@` action acts exactly like the `=` action, and evalates the argument array. This means that any statements in the argument gets executed. And in the example above, this meant that the variables where changed.

But it is possible to set a value to a variable *without* evaluating the arguments. This is useful when we want to execute a block of code at a later time, or many times over. This is also the key mechanism for structuring code as services and actions. 

It is done with the action `:`:

<!-- test-example6.hl -->
```javascript
@ new bar = 1
	
@ new foo : // the statement in the argument is not evaluated yet
	@ set bar = 2
	
@ new barBefore = (@.bar)
	
@ foo _ // this invokes the foo action, and the code is evaluated

@ new barAfter = (@.bar)

@ new results =
	@.barBefore
	@.barAfter

//result: [1, 2]
```

Notice how `_` is used as argument for `foo`. This is because `foo` does not use its argument. So any argument would be ignored anyway. 

If an array of statements is executed, the value of the *last* statement is returned from the action. All hilvl code are arrays of statements, so this is why the last value is always the result in the examples. 

## Advanced examples of hilvl

#### Scope and higher-order programming

<!-- test-example2.hl -->
```javascript
@ new foo = 10 // Variable in outer scope

@ new MyService @ 
	@ new myAction :
		@ set foo = 42 // Variable in inner scope
		@ new myFunction : (@.argument) // Saving argument without evaluating it
		@ myFunction _ // Invoking the argument as an action
		
@ new bar = 
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
	
<!-- TODO: Should have one example focused on scope, and another focused on higher order programming -->

#### Fluent programming

<!-- test-example3.hl -->
```javascript
@ new Please @ 
	@ new add :
		@ new arg1 = (@.argument)
		@.Please // Returning the service itself
	@ new and :
		@ new arg2 = (@.argument)
		@.Please // Returning the service itself
	@ new andThen :
		@.arg1 + (@.arg2) + (@.argument)
		
Please add 42 and 50 andThen 100
	
//result: 192
```

### How to run hilvl

To run a file with hilvl code: `node hl.js myFile.hl`
	
To run all tests: `node test/run-all-tests.js`

To run HiTTP web framework: `node HiTTP.js example-webapp.hl`

<!-- TODO: Explain HiTTP -->