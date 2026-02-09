import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { TrendingUp, TrendingDown, Users, DollarSign, Wallet, Activity } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { useMembers } from "../MembersContext";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "../AuthContext";
import { useEffect, useState } from "react";


// Mock data for charts


const memberAttendanceData = [
  { month: "Jan", attendance: 92 },
  { month: "Feb", attendance: 88 },
  { month: "Mar", attendance: 95 },
  { month: "Apr", attendance: 90 },
  { month: "May", attendance: 93 },
  { month: "Jun", attendance: 91 },
  { month: "Jul", attendance: 94 },
  { month: "Aug", attendance: 89 },
  { month: "Sep", attendance: 96 },
  { month: "Oct", attendance: 92 },
  { month: "Nov", attendance: 94 },
];





const loanRepaymentData = [
  { month: "Jan", onTime: 85, late: 10, defaulted: 5 },
  { month: "Feb", onTime: 88, late: 8, defaulted: 4 },
  { month: "Mar", onTime: 90, late: 7, defaulted: 3 },
  { month: "Apr", onTime: 87, late: 9, defaulted: 4 },
  { month: "May", onTime: 92, late: 6, defaulted: 2 },
  { month: "Jun", onTime: 91, late: 7, defaulted: 2 },
  { month: "Jul", onTime: 93, late: 5, defaulted: 2 },
  { month: "Aug", onTime: 89, late: 8, defaulted: 3 },
  { month: "Sep", onTime: 94, late: 4, defaulted: 2 },
  { month: "Oct", onTime: 95, late: 3, defaulted: 2 },
  { month: "Nov", onTime: 96, late: 3, defaulted: 1 },
];


export function DashboardView() {
  const { members} = useMembers();
   const { shgId } = useAuth();

  const [totalSavings, setTotalSavings] = useState(0);
  const [activeLoanAmount, setActiveLoanAmount] = useState(0);
  const [avgTrustScore, setAvgTrustScore] = useState<number>(0);
const [trustScoreDistribution, setTrustScoreDistribution] = useState({
  high: 0,   // 90–100
  good: 0,   // 80–89
  medium: 0, // 70–79
  low: 0,    // <70
});

const pieData = [
  { name: "81-100", value: trustScoreDistribution.high, color: "#10b981" },
  { name: "71-80", value: trustScoreDistribution.good, color: "#3b82f6" },
  { name: "51-70", value: trustScoreDistribution.medium, color: "#f59e0b" },
  { name: "below 50", value: trustScoreDistribution.low, color: "#ef4444" },
];
const trustScoreLegend = [
  {
    range: "81–100",
    count: trustScoreDistribution.high,
    color: "#10b981",
  },
  {
    range: "71-80",
    count: trustScoreDistribution.good,
    color: "#3b82f6",
  },
  {
    range: "51-70",
    count: trustScoreDistribution.medium,
    color: "#f59e0b",
  },
  {
    range: "50 or its below",
    count: trustScoreDistribution.low,
    color: "#ef4444",
  },
];

const [paymentStatus, setPaymentStatus] = useState({
  fullyPaid: 0,
  notFullyPaid: 0,
});
const paymentPieData = [
  {
    name: "Paid All Monthly Rounds",
    value: paymentStatus.fullyPaid,
    color: "#10b981",
  },
  {
    name: "Not Paid All Monthly Rounds",
    value: paymentStatus.notFullyPaid,
    color: "#ef4444",
  },
];
const [attendanceBuckets, setAttendanceBuckets] = useState([
  { range: "0–25%", count: 0 },
  { range: "26–50%", count: 0 },
  { range: "51–75%", count: 0 },
  { range: "76–100%", count: 0 },
]);



  useEffect(() => {
    if (!shgId) return;

    const fetchTotalSavings = async () => {
      let total = 0;

      const roundsSnap = await getDocs(
        collection(db, "ShgGroups", shgId, "monthlyRounds")
      );

      for (const round of roundsSnap.docs) {
        const contributionsSnap = await getDocs(
          collection(
            db,
            "ShgGroups",
            shgId,
            "monthlyRounds",
            round.id,
            "contributions"
          )
        );

        contributionsSnap.forEach((doc) => {
          total += doc.data().amountPaid || 0;
        });
      }

      setTotalSavings(total);
    };

    fetchTotalSavings();
  }, [shgId]);

  useEffect(() => {
    if (!shgId) return;

    const fetchActiveLoans = async () => {
      let total = 0;

      const loansSnap = await getDocs(
        query(
          collection(db, "ShgGroups", shgId, "loans"),
          where("status", "==", "APPROVED")
        )
      );

      loansSnap.forEach((doc) => {
        total += doc.data().remainingAmount || 0;
      });

      setActiveLoanAmount(total);
    };

    fetchActiveLoans();
  }, [shgId]);

  const [monthlyChartData, setMonthlyChartData] = useState<any[]>([]);
  const getMonthKey = (timestamp: any) => {
  const date = timestamp.toDate();
  return date.toLocaleString("en-US", { month: "short" });
};
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];


useEffect(() => {
  if (!shgId) return;

  const fetchMonthlyGraphData = async () => {
    const monthlyMap: any = {};

    // ---------------- SAVINGS ----------------
    const roundsSnap = await getDocs(
      collection(db, "ShgGroups", shgId, "monthlyRounds")
    );

    for (const round of roundsSnap.docs) {
      const contribSnap = await getDocs(
        collection(
          db,
          "ShgGroups",
          shgId,
          "monthlyRounds",
          round.id,
          "contributions"
        )
      );

      contribSnap.forEach((doc) => {
        const data = doc.data();
        if (!data.paidAt) return;

        const month = getMonthKey(data.paidAt);
        if (!monthlyMap[month]) {
          monthlyMap[month] = { month, savings: 0, loans: 0, repayments: 0 };
        }
        monthlyMap[month].savings += data.amountPaid || 0;
      });
    }

    // ---------------- LOANS DISBURSED ----------------
    const loansSnap = await getDocs(
      query(
        collection(db, "ShgGroups", shgId, "loans"),
        where("status", "==", "APPROVED")
      )
    );

    loansSnap.forEach((doc) => {
      const data = doc.data();
      if (!data.disbursedAt) return;

      const month = getMonthKey(data.disbursedAt);
      if (!monthlyMap[month]) {
        monthlyMap[month] = { month, savings: 0, loans: 0, repayments: 0 };
      }
      monthlyMap[month].loans += data.amount || 0;
    });

    // ---------------- REPAYMENTS ----------------
    for (const loan of loansSnap.docs) {
      const repaySnap = await getDocs(
        collection(
          db,
          "ShgGroups",
          shgId,
          "loans",
          loan.id,
          "repayments"
        )
      );

      repaySnap.forEach((doc) => {
        const data = doc.data();
        if (!data.paidAt) return;

        const month = getMonthKey(data.paidAt);
        if (!monthlyMap[month]) {
          monthlyMap[month] = { month, savings: 0, loans: 0, repayments: 0 };
        }
        monthlyMap[month].repayments += data.amount || 0;
      });
    }
    const normalizedData = MONTHS.map((month) => ({
  month,
  savings: monthlyMap[month]?.savings || 0,
  repayments: monthlyMap[month]?.repayments || 0,
  loans: monthlyMap[month]?.loans || 0,
}));

setMonthlyChartData(normalizedData);
    //setMonthlyChartData(Object.values(monthlyMap));
  };

  fetchMonthlyGraphData();
}, [shgId]);

useEffect(() => {
  if (!shgId) return;

  const fetchAvgTrustScore = async () => {
    const snap = await getDocs(
      collection(db, "ShgGroups", shgId, "members")
    );

    let total = 0;
    let count = 0;

    snap.forEach((doc) => {
      const data = doc.data();

      if (typeof data.trustScore === "number") {
        total += data.trustScore;
        count++;
      }
    });

    const avg = count === 0 ? 0 : Number((total / count).toFixed(1));
    setAvgTrustScore(avg);
  };

  fetchAvgTrustScore();
}, [shgId]);

useEffect(() => {
  if (!shgId) return;

  const fetchMembersAndTrustScores = async () => {
    const snap = await getDocs(
      collection(db, "ShgGroups", shgId, "members")
    );

    let high = 0;
    let good = 0;
    let medium = 0;
    let low = 0;

    snap.docs.forEach((doc) => {
      const data = doc.data();
      const score = data.trustScore ?? 0;

      if (score >= 81) high++;
      else if (score >=71) good++;
      else if (score >= 51) medium++;
      else low++;
    });

    setTrustScoreDistribution({ high, good, medium, low });
  };

  fetchMembersAndTrustScores();
}, [shgId]);

useEffect(() => {
  if (!shgId) return;

  const calculatePaymentStatus = async () => {
    const roundsSnap = await getDocs(
      collection(db, "ShgGroups", shgId, "monthlyRounds")
    );

    const totalRounds = roundsSnap.size;
    if (totalRounds === 0) return;

    const memberPaymentCount: Record<string, number> = {};

    for (const round of roundsSnap.docs) {
      const contribSnap = await getDocs(
        collection(
          db,
          "ShgGroups",
          shgId,
          "monthlyRounds",
          round.id,
          "contributions"
        )
      );

      contribSnap.forEach((doc) => {
        const memberId = doc.id;
        memberPaymentCount[memberId] =
          (memberPaymentCount[memberId] || 0) + 1;
      });
    }

    let fullyPaid = 0;
    let notFullyPaid = 0;

    members.forEach((member: any) => {
      const paid = memberPaymentCount[member.id] || 0;
      if (paid === totalRounds) fullyPaid++;
      else notFullyPaid++;
    });

    setPaymentStatus({ fullyPaid, notFullyPaid });
  };

  calculatePaymentStatus();
}, [shgId, members]);

useEffect(() => {
  if (!shgId) return;

  const fetchAttendanceDistribution = async () => {
    const snap = await getDocs(
      collection(db, "ShgGroups", shgId, "members")
    );

    let b1 = 0, b2 = 0, b3 = 0, b4 = 0;

    snap.forEach((doc) => {
      const attendance = doc.data().attendance ?? 0;

      if (attendance <= 25) b1++;
      else if (attendance <= 50) b2++;
      else if (attendance <= 75) b3++;
      else b4++;
    });

    setAttendanceBuckets([
      { range: "0–25%", count: b1 },
      { range: "26–50%", count: b2 },
      { range: "51–75%", count: b3 },
      { range: "76–100%", count: b4 },
    ]);
  };

  fetchAttendanceDistribution();
}, [shgId]);



  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-gray-900">Dashboard</h1>
        <p className="text-gray-600">SHG performance metrics and analytics</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-teal-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Members</p>
                <p className="text-3xl text-teal-700 mt-1">{members.length}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-600">+5 this month</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Savings</p>
                <p className="text-3xl text-green-700 mt-1">₹{totalSavings.toLocaleString("en-IN")}</p>

                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-600">+12% vs last month</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Wallet className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Loans</p>
                <p className="text-3xl text-blue-700 mt-1">₹{activeLoanAmount.toLocaleString("en-IN")}</p>

                <div className="flex items-center gap-1 mt-2">
                  <TrendingDown className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-600">-8% repayments</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Trust Score</p>
                <p className="text-3xl font-bold text-purple-600">{avgTrustScore}</p>

                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-600">+2.3 points</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-3 gap-6">
        {/* Monthly Financial Activity */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Monthly Financial Activity</CardTitle>
            <CardDescription>Savings, loans disbursed, and repayments over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value) => `₹${(value as number).toLocaleString()}`}
                />
                <Legend />
                <Area type="monotone" dataKey="savings" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Savings" />
                <Area type="monotone" dataKey="repayments" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Repayments" />
                <Area type="monotone" dataKey="loans" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="Loans Disbursed" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Trust Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Trust Score Distribution</CardTitle>
            <CardDescription>Member distribution by score range</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
            <PieChart width={300} height={300}>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>

            </ResponsiveContainer>
                        <div className="mt-4 space-y-2">
              {trustScoreLegend.map((item) => (
                <div
                  key={item.range}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-gray-700">{item.range}</span>
                  </div>
                  <span className="text-gray-900">
                    {item.count} members
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-2 gap-6">
        {/* Loan Repayment Status */}
        <Card>
  <CardHeader>
    <CardTitle>Monthly Round Payment Status</CardTitle>
    <CardDescription>
      Members who completed all monthly contributions
    </CardDescription>
  </CardHeader>

  <CardContent>
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={paymentPieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label
        >
          {paymentPieData.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>

    <div className="mt-4 space-y-2">
      {paymentPieData.map((item) => (
        <div
          key={item.name}
          className="flex items-center justify-between text-sm"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.name}</span>
          </div>
          <span>{item.value} members</span>
        </div>
      ))}
    </div>
  </CardContent>
</Card>


        {/* Meeting Attendance Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Meeting Attendance Trend</CardTitle>
            <CardDescription>Average attendance percentage per month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <Card>
  <CardHeader>
    <CardTitle>Attendance Distribution</CardTitle>
    <CardDescription>
      Members grouped by attendance percentage
    </CardDescription>
  </CardHeader>

  <CardContent>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={attendanceBuckets}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="range" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar
          dataKey="count"
          fill="#3b82f6"
          name="Members"
          radius={[6, 6, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  </CardContent>
</Card>

            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-teal-50 to-blue-50 border-teal-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl text-gray-900 mt-1">156 Transactions</p>
                <Badge className="mt-2 bg-teal-600">+18% vs last month</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-teal-50 border-green-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Repayment Rate</p>
                <p className="text-2xl text-gray-900 mt-1">96%</p>
                <Badge className="mt-2 bg-green-600">Excellent</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Group Health Score</p>
                <p className="text-2xl text-gray-900 mt-1">A+</p>
                <Badge className="mt-2 bg-blue-600">Top Performing</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
